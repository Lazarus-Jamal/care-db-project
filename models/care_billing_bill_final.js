
// models/care_billing_bill_final.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_billing_bill_final = sequelize.define('care_billing_bill_final', {
    id:                            { type: DataTypes.INTEGER,          primaryKey: true, autoIncrement: true },
    encounter_nr:                  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    facility_id:                   { type: DataTypes.INTEGER, allowNull: false },
    bill_no:                       { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    date:                          { type: DataTypes.DATE,             allowNull: true },
    bill_amount:                   { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    discount:                      { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    receipt_amount:                { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    patient_amount:                { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    insurance_amount:              { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    amount_due:                    { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    amount_recieved:               { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    agent:                         { type: DataTypes.STRING(50),       allowNull: false, defaultValue: '' },
    status:                        { type: DataTypes.STRING(25),       allowNull: false, defaultValue: 'open' },
    fact:                          { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_billing_bill_final',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
      { name: 'idx_final_bill_no', fields: ['bill_no'] },
    ],
  });
  return care_billing_bill_final;
};


