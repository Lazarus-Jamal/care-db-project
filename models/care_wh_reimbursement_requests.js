// models/care_wh_reimbursement_requests.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const m = sequelize.define('care_wh_reimbursement_requests', {
    reimb_id:             { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    request_number:       { type: DataTypes.STRING(30),    allowNull: false, defaultValue: '' },
    po_id:                { type: DataTypes.INTEGER,       allowNull: true },
    purchase_description: { type: DataTypes.TEXT,          allowNull: true },
    amount:               { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0.00 },
    total_amount:         { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0.00 },
    reason:               { type: DataTypes.TEXT,          allowNull: true },
    status:               { type: DataTypes.STRING(25),    allowNull: false, defaultValue: 'pending' },
    created_by:           { type: DataTypes.STRING(60),    allowNull: false, defaultValue: '' },
    create_time:          { type: DataTypes.DATE,          allowNull: false, defaultValue: DataTypes.NOW },
    acknowledged_by:      { type: DataTypes.STRING(60),    allowNull: true },
    acknowledged_at:      { type: DataTypes.DATE,          allowNull: true },
    director_approved_by: { type: DataTypes.STRING(60),    allowNull: true },
    director_approved_at: { type: DataTypes.DATE,          allowNull: true },
    director_notes:       { type: DataTypes.TEXT,          allowNull: true },
    finance_approved_by:  { type: DataTypes.STRING(60),    allowNull: true },
    finance_approved_at:  { type: DataTypes.DATE,          allowNull: true },
    payment_method:       { type: DataTypes.STRING(30),    allowNull: true },
    payment_reference:    { type: DataTypes.STRING(100),   allowNull: true },
    paid_at:              { type: DataTypes.DATE,          allowNull: true },
    paid_by:              { type: DataTypes.STRING(60),    allowNull: true },
    rejected_by:          { type: DataTypes.STRING(60),    allowNull: true },
    rejected_at:          { type: DataTypes.DATE,          allowNull: true },
    rejection_reason:     { type: DataTypes.TEXT,          allowNull: true },
    notes:                { type: DataTypes.TEXT,          allowNull: true },
  }, { tableName: 'care_wh_reimbursement_requests', timestamps: false });

  m.associate = (models) => {
    m.belongsTo(models.care_wh_purchase_orders,
      { foreignKey: 'po_id', as: 'po', constraints: false });
    m.hasMany(models.care_wh_reimb_receipts,
      { foreignKey: 'reimb_id', as: 'receipts' });
  };
  return m;
};
