const { User, care_staff } = require('../models');

async function backfillUserPid() {
  try {
    const users = await User.findAll({
      where: { pid: null },
      include: [{ model: care_staff, as: 'staff' }]
    });

    for (const user of users) {
      if (user.staff && user.staff.pid) {
        user.pid = user.staff.pid;
        await user.save();
        console.log(`✅ Updated user '${user.username}' with pid ${user.pid}`);
      } else {
        console.log(`⚠️ Skipped user '${user.username}' - no linked staff or pid`);
      }
    }

    console.log('🎉 Backfill complete.');
  } catch (error) {
    console.error('❌ Error during backfill:', error);
  }
}

backfillUserPid();
