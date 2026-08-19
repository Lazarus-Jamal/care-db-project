// models/care_wh_product_suppliers.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_wh_product_suppliers = sequelize.define('care_wh_product_suppliers', {
    id:                  { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    product_id:          { type: DataTypes.INTEGER,      allowNull: false },
    supplier_id:         { type: DataTypes.INTEGER,      allowNull: false },
    supplier_item_code:  { type: DataTypes.STRING(50),   allowNull: true },
    unit_price:          { type: DataTypes.DECIMAL(12,2),allowNull: false, defaultValue: 0.00 },
    lead_time_days:      { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
    is_preferred:        { type: DataTypes.TINYINT,      allowNull: false, defaultValue: 0 },
    last_order_date:     { type: DataTypes.DATEONLY,     allowNull: true },
  }, {
    tableName:  'care_wh_product_suppliers',
    timestamps: false,
  });

  care_wh_product_suppliers.associate = (models) => {
    care_wh_product_suppliers.belongsTo(models.care_wh_products, {
      foreignKey: 'product_id',
      as:         'product',
    });
    care_wh_product_suppliers.belongsTo(models.care_wh_suppliers, {
      foreignKey: 'supplier_id',
      as:         'supplier',
    });
  };

  return care_wh_product_suppliers;
};
