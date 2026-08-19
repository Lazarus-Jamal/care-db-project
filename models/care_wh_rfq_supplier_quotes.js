// models/care_wh_rfq_supplier_quotes.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_rfq_supplier_quotes = sequelize.define('care_wh_rfq_supplier_quotes', {
    quote_id:           { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    rfq_id:             { type: DataTypes.INTEGER,       allowNull: false },
    supplier_id:        { type: DataTypes.INTEGER,       allowNull: false },
    product_id:         { type: DataTypes.INTEGER,       allowNull: false },
    unit_price:         { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0.00 },
    quantity_available: { type: DataTypes.INTEGER,       allowNull: false, defaultValue: 0 },
    lead_time_days:     { type: DataTypes.INTEGER,       allowNull: false, defaultValue: 0 },
    responded_at:       { type: DataTypes.DATE,          allowNull: true },
    notes:              { type: DataTypes.TEXT,          allowNull: true },
    selected:           { type: DataTypes.TINYINT,       allowNull: false, defaultValue: 0 },
  }, { tableName: 'care_wh_rfq_supplier_quotes', timestamps: false });

  care_wh_rfq_supplier_quotes.associate = (models) => {
    care_wh_rfq_supplier_quotes.belongsTo(models.care_wh_rfq,      { foreignKey: 'rfq_id',     as: 'rfq' });
    care_wh_rfq_supplier_quotes.belongsTo(models.care_wh_suppliers, { foreignKey: 'supplier_id', as: 'supplier' });
    care_wh_rfq_supplier_quotes.belongsTo(models.care_wh_products,  { foreignKey: 'product_id',  as: 'product' });
  };
  return care_wh_rfq_supplier_quotes;
};
