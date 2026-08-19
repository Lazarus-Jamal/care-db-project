
// index.js (Main Application File)

const express     = require('express');
const path        = require('path');
const dotenv      = require('dotenv');
const session     = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize   = require('./config/database');
const csurf       = require('csurf');
const rateLimit   = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const activeUsers = require('./utils/activeUsers');
exports.activeUsers = activeUsers;

const authRoutes            = require('./routes/auth');
const adminRoutes           = require('./routes/admin');
const staffRoutes           = require('./routes/staff');
const testRoutes            = require('./routes/test');
const logRoutes             = require('./routes/logs');
const localeRoutes          = require('./routes/locale');
const authMiddleware        = require('./middleware/authMiddleware');
const facilityMiddleware    = require('./middleware/facilityMiddleware');
const permissionsMiddleware = require('./middleware/permissionsMiddleware');
const localeMiddleware      = require('./middleware/localeMiddleware');
const patientRoutes         = require('./routes/patient');
const encounterRoutes       = require('./routes/encounters');
const billingRoutes         = require('./routes/billing');
const prescriptionRoutes    = require('./routes/prescriptions');
const diagnosisRoutes       = require('./routes/diagnoses');
const warehouseRoutes       = require('./routes/warehouse');
const models                = require('./models');
const dashboardController   = require('./controllers/dashboardController');
const authController        = require('./controllers/authController');

dotenv.config();
const app  = express();
const PORT = process.env.PORT || 3000;

// ── Static files ───────────────────────────────────────────
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/bootstrap',    express.static(path.join(process.cwd(), 'node_modules/bootstrap')));
app.use('/@fortawesome', express.static(path.join(process.cwd(), 'node_modules/@fortawesome')));

// ── Body + cookie parsing ──────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET || 'a_very_secure_secret_key'));

// ── Rate limiting ──────────────────────────────────────────
// General limiter — all routes: 300 requests per minute
const globalLimiter = rateLimit({
    windowMs:          60 * 1000,
    max:               300,
    standardHeaders:   true,
    legacyHeaders:     false,
    message:           'Too many requests, please try again in a moment.',
});
// Strict limiter — login route only: 10 attempts per minute
const loginLimiter = rateLimit({
    windowMs:          60 * 1000,
    max:               10,
    standardHeaders:   true,
    legacyHeaders:     false,
    message:           'Too many login attempts, please wait before trying again.',
});
app.use(globalLimiter);

// ── Session ────────────────────────────────────────────────
const sessionStore = new SequelizeStore({ db: sequelize, tableName: 'care_sessions' });

app.use(session({
    secret:            process.env.SESSION_SECRET || 'a_very_secure_secret_key',
    resave:            false,
    saveUninitialized: false,
    store:             sessionStore,
    cookie: {
        maxAge:   3600000,
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
}));

// ── Locale ─────────────────────────────────────────────────
app.use(localeMiddleware);

// ── Common locals ──────────────────────────────────────────
app.use((req, res, next) => {
    res.locals.activePage = req.path.split('/')[1] || 'home';
    next();
});

// ── View engine ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

// ── DB ─────────────────────────────────────────────────────
sequelize.authenticate()
    .then(() => console.log('✅ Database connected...'))
    .catch(err => console.error('❌ DB connection error:', err));

sessionStore.sync({ alter: true })
    .then(() => { console.log('✅ Session store synced...'); return sequelize.sync({ alter: false }); })
    .then(() => console.log('✅ Models verified (no schema changes applied)...'))
    .catch(err => console.error('❌ Model sync error:', err));

// ── Routes BEFORE CSRF ────────────────────────────────────────
// locale switcher — read-only session write, safe before CSRF
app.use('/locale', localeRoutes);
// AJAX read-only lookup fired on username blur — must be before CSRF
// so it doesn't consume and invalidate the login form's CSRF token
app.post('/auth/get-user-facility-and-role', authController.getUserFacilityAndRole);
// server time — read-only
app.get('/auth/server-time', authController.getServerTime);
// redirect shortcuts
app.get('/login',  (req, res) => res.redirect('/auth/login'));
app.get('/logout', (req, res) => res.redirect('/auth/logout'));

// ── CSRF — all routes below are protected ─────────────────────
const csrfProtection = csurf({ ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] });
app.use(csrfProtection);

// Inject csrfToken into res.locals after CSRF is active
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// ── Auth routes (login GET/POST, logout) ──────────────────────
// Login-specific rate limiter applied before auth routes
app.use('/auth/login', loginLimiter);
app.use('/auth', authRoutes);

// ── Protected routes ──────────────────────────────────────────
app.use(authMiddleware, permissionsMiddleware, facilityMiddleware);

app.get('/', dashboardController.getDashboard);
app.use('/admin',    adminRoutes);
app.use('/staff',    staffRoutes);
app.use('/patients', patientRoutes);
app.use('/encounters', encounterRoutes);
app.use('/referrals',  require('./routes/referrals'));
app.use('/billing',    billingRoutes);
app.use('/prescriptions', prescriptionRoutes);
app.use('/diagnoses',     diagnosisRoutes);
app.use('/warehouse',     warehouseRoutes);
app.use('/warehouse/purchase-orders', require('./routes/purchase-orders'));
app.use('/warehouse/rfq',              require('./routes/rfq'));
app.use('/warehouse/locations',        require('./routes/locations'));
app.use('/warehouse/deliveries',       require('./routes/deliveries'));
app.use('/warehouse/stock',            require('./routes/stock'));
app.use('/warehouse/inventory-counts', require('./routes/inventory-counts'));
app.use('/pharmacy/inventory-counts', require('./routes/pharmacy-inventory-counts'));
app.use('/finances/reimbursements',    require('./routes/reimbursements'));
app.use('/warehouse/reports',          require('./routes/reports'));
app.use('/warehouse/pharmacy-orders',  require('./routes/warehouse-pharmacy'));
app.use('/pharmacy',                   require('./routes/pharmacy'));
app.use('/stats',                      require('./routes/stats'));
app.use('/logs',     logRoutes);

// ── CSRF error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);
    console.error('❌ CSRF token error:', err.message);
    res.redirect('/auth/login');
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));


























