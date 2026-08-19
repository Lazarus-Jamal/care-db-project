
// models/care_billing_bill_item.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_billing_bill_item = sequelize.define('care_billing_bill_item', {
    id:                    { type: DataTypes.INTEGER,          primaryKey: true, autoIncrement: true },
    encounter_nr:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    facility_id:                   { type: DataTypes.INTEGER, allowNull: false },
    code:                  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    item_id:               { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    article:               { type: DataTypes.STRING(100),      allowNull: false, defaultValue: '' },
    unit_cost:             { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    units:                 { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 1 },
    amount:                { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    date:                  { type: DataTypes.DATE,             allowNull: true },
    status:                { type: DataTypes.STRING(25),       allowNull: false, defaultValue: 'open' },
    bill_no:               { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    islab:                 { type: DataTypes.TINYINT,          allowNull: false, defaultValue: 0 },
    labpr:                 { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    class:                 { type: DataTypes.STRING(50),       allowNull: false, defaultValue: '' },
    qtealivrer:            { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    qtelivree:             { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    livrer:                { type: DataTypes.SMALLINT,         allowNull: false, defaultValue: 0 },
    livrerpar:             { type: DataTypes.STRING(100),      allowNull: false, defaultValue: '' },
    livrerle:              { type: DataTypes.DATE,             allowNull: true },
    billtype:              { type: DataTypes.STRING(15),       allowNull: false, defaultValue: '' },
    societe:               { type: DataTypes.STRING(150),      allowNull: true },
    percent:               { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    down:                  { type: DataTypes.INTEGER,          allowNull: false, defaultValue: 0 },
    insurance_provider_id: { type: DataTypes.INTEGER,          allowNull: true },
    insurance_pct:         { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    payment_id:            { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName:  'care_billing_bill_item',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
      { name: 'idx_bill_item_id', fields: ['item_id'] },
      // Confirmed via SHOW FULL PROCESSLIST catching this exact query
      // still executing after 5+ seconds -- the pharmacy dashboard/queue
      // filters on all three of these together, and separate
      // single-column indexes weren't enough for MySQL to narrow down
      // in one pass.
      // Corrected column order: facility_id=1 matches 99.9997% of this
      // table (confirmed live), so it provides almost no selectivity
      // and belongs last, not first. livrer/status actually narrow
      // the data down.
      // Final design: confirmed via live data that status/livrer/facility_id
      // are individually and jointly not selective (594,592 of 1.56M rows
      // match all three together) -- the 8-year historical dataset
      // migrated from the prior system never reliably tracked livrer.
      // date is the column that actually narrows this down (a 2026+
      // cutoff excludes the historical bulk), so it's included here as
      // the trailing range column, after the three equality columns.
      { name: 'idx_bill_item_pharmacy_queue', fields: ['status', 'livrer', 'facility_id', 'date'] },
    ],
  });
  return care_billing_bill_item;
};


