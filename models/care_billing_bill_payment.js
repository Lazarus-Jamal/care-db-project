
// models/care_billing_bill_payment.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_billing_bill_payment = sequelize.define('care_billing_bill_payment', {
    payment_id:              { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    payment_encounter_nr:    { type: DataTypes.BIGINT.UNSIGNED,  allowNull: false, defaultValue: 0 },
    facility_id:                   { type: DataTypes.INTEGER, allowNull: false },
    bill_no:                 { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    payment_receipt_no:      { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    payment_mode:            { type: DataTypes.STRING(20),       allowNull: false, defaultValue: 'cash' },
    payment_date:            { type: DataTypes.DATE,             allowNull: true },
    payment_cash_amount:     { type: DataTypes.FLOAT,            allowNull: true,  defaultValue: 0 },
    payment_cheque_no:       { type: DataTypes.INTEGER,          allowNull: true,  defaultValue: 0 },
    payment_cheque_amount:   { type: DataTypes.FLOAT,            allowNull: true,  defaultValue: 0 },
    payment_creditcard_no:   { type: DataTypes.INTEGER,          allowNull: true,  defaultValue: 0 },
    payment_creditcard_amount: { type: DataTypes.FLOAT,          allowNull: true,  defaultValue: 0 },
    payment_amount_total:    { type: DataTypes.FLOAT,            allowNull: true,  defaultValue: 0 },
    received_by:             { type: DataTypes.STRING(50),       allowNull: false, defaultValue: '' },
    status:                  { type: DataTypes.STRING(25),       allowNull: false, defaultValue: 'completed' },
  }, {
    tableName:  'care_billing_bill_payment',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
      { name: 'idx_payment_bill_no', fields: ['bill_no'] },
    ],
  });
  return care_billing_bill_payment;
};


