
// models/care_billing_bill.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_billing_bill = sequelize.define('care_billing_bill', {
    bill_no:                       { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    encounter_nr:                  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    facility_id:                   { type: DataTypes.INTEGER, allowNull: false },
    date:                          { type: DataTypes.DATE,             allowNull: true },
    amount:                        { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    billgeneral:                   { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    insurance_provider_id:         { type: DataTypes.INTEGER,          allowNull: true },
    insurance_pct:                 { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    agent:                         { type: DataTypes.STRING(50),       allowNull: false, defaultValue: '' },
    status:                        { type: DataTypes.STRING(25),       allowNull: false, defaultValue: 'open' },
  }, {
    tableName:  'care_billing_bill',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
    ],
  });
  return care_billing_bill;
};


