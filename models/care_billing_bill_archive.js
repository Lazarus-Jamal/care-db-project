// models/care_billing_bill_archive.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_billing_bill_archive = sequelize.define('care_billing_bill_archive', {
    bill_no:                       { type: DataTypes.BIGINT,           allowNull: false, defaultValue: 0 },
    encounter_nr:                  { type: DataTypes.BIGINT.UNSIGNED,  allowNull: false, defaultValue: 0 },
    patient_name:                  { type: DataTypes.TEXT,             allowNull: false },
    vorname:                       { type: DataTypes.STRING(35),       allowNull: false, defaultValue: '' },
    bill_date_time:                { type: DataTypes.DATE,             allowNull: false },
    bill_amt:                      { type: DataTypes.DOUBLE,           allowNull: false, defaultValue: 0 },
    payment_date_time:             { type: DataTypes.DATE,             allowNull: false },
    payment_mode:                  { type: DataTypes.TEXT,             allowNull: false },
    cheque_no:                     { type: DataTypes.STRING(10),       allowNull: false, defaultValue: '' },
    creditcard_no:                 { type: DataTypes.STRING(10),       allowNull: false, defaultValue: '' },
    paid_by:                       { type: DataTypes.STRING(15),       allowNull: false, defaultValue: '' },
  }, {
    tableName:  'care_billing_bill_archive',
    timestamps: false,
  });
  return care_billing_bill_archive;
};
