
// models/care_pharma_transit.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const m = sequelize.define('care_pharma_transit', {
    id:             { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    order_id:       { type: DataTypes.INTEGER,     allowNull: false },
    order_number:   { type: DataTypes.STRING(30),  allowNull: false, defaultValue: '' },
    order_item_id:  { type: DataTypes.INTEGER,     allowNull: false },
    product_id:     { type: DataTypes.INTEGER,     allowNull: false },
    item_code:      { type: DataTypes.STRING(50),  allowNull: false, defaultValue: '' },
    product_name:   { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    qty_in_transit: { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
    batch_number:   { type: DataTypes.STRING(100), allowNull: true },
    expiry_date:    { type: DataTypes.DATEONLY,    allowNull: true },
    dispatched_by:  { type: DataTypes.STRING(60),  allowNull: false, defaultValue: '' },
    dispatched_at:  { type: DataTypes.DATE,        allowNull: false },
    accepted_qty:   { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
    accepted_by:    { type: DataTypes.STRING(60),  allowNull: true },
    accepted_at:    { type: DataTypes.DATE,        allowNull: true },
    status:         { type: DataTypes.STRING(20),  allowNull: false, defaultValue: 'in_transit' },
    notes:          { type: DataTypes.TEXT,        allowNull: true },
  }, {
    tableName: 'care_pharma_transit',
    timestamps: false,
    indexes: [
      { name: 'idx_transit_order', fields: ['order_id'] },
    ],
  });
  return m;
};


