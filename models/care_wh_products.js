// models/care_wh_products.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_wh_products = sequelize.define('care_wh_products', {
    product_id:       { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    item_code:        { type: DataTypes.STRING(50),   allowNull: false, defaultValue: '' },
    name:             { type: DataTypes.STRING(255),  allowNull: false, defaultValue: '' },
    generic_name:     { type: DataTypes.STRING(255),  allowNull: true },
    category_id:      { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 1 },
    unit_of_measure:  { type: DataTypes.STRING(50),   allowNull: false, defaultValue: '' },
    reorder_level:    { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
    reorder_quantity: { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
    current_stock:    { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
    pharmacy_item_id: { type: DataTypes.BIGINT,       allowNull: true },
    is_active:        { type: DataTypes.TINYINT,      allowNull: false, defaultValue: 1 },
    abc_class:        { type: DataTypes.CHAR(1),      allowNull: false, defaultValue: 'B' },
    created_by:       { type: DataTypes.STRING(60),   allowNull: false, defaultValue: '' },
    create_time:      { type: DataTypes.DATE,         allowNull: false, defaultValue: DataTypes.NOW },
    modify_time:      { type: DataTypes.DATE,         allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName:  'care_wh_products',
    timestamps: false,
  });

  care_wh_products.associate = (models) => {
    care_wh_products.belongsTo(models.care_wh_product_categories, {
      foreignKey: 'category_id', as: 'category',
    });
    care_wh_products.hasMany(models.care_wh_product_suppliers, {
      foreignKey: 'product_id', as: 'productSuppliers',
    });
    care_wh_products.belongsToMany(models.care_wh_suppliers, {
      through: models.care_wh_product_suppliers,
      foreignKey: 'product_id', otherKey: 'supplier_id', as: 'suppliers',
    });
    care_wh_products.belongsTo(models.care_drugsandservices, {
      foreignKey: 'pharmacy_item_id', targetKey: 'item_id',
      as: 'pharmacyItem', constraints: false,
    });
    care_wh_products.hasMany(models.care_wh_stock,         { foreignKey: 'product_id', as: 'stockBatches' });
    care_wh_products.hasMany(models.care_wh_rfq_items,     { foreignKey: 'product_id', as: 'rfqItems' });
  };

  return care_wh_products;
};
