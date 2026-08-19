// models/care_wh_suppliers.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_wh_suppliers = sequelize.define('care_wh_suppliers', {
    supplier_id:    { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:           { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    contact_person: { type: DataTypes.STRING(100), allowNull: true },
    phone:          { type: DataTypes.STRING(30),  allowNull: true },
    email:          { type: DataTypes.STRING(100), allowNull: true },
    address:        { type: DataTypes.TEXT,        allowNull: true },
    tax_id:         { type: DataTypes.STRING(50),  allowNull: true },
    payment_terms:  { type: DataTypes.STRING(100), allowNull: true },
    is_active:      { type: DataTypes.TINYINT,     allowNull: false, defaultValue: 1 },
    notes:          { type: DataTypes.TEXT,        allowNull: true },
    created_by:     { type: DataTypes.STRING(60),  allowNull: false, defaultValue: '' },
    create_time:    { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
    modify_time:    { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName:  'care_wh_suppliers',
    timestamps: false,
  });

  care_wh_suppliers.associate = (models) => {
    care_wh_suppliers.hasMany(models.care_wh_product_suppliers, {
      foreignKey: 'supplier_id',
      as:         'supplierProducts',
    });
    care_wh_suppliers.belongsToMany(models.care_wh_products, {
      through:    models.care_wh_product_suppliers,
      foreignKey: 'supplier_id',
      otherKey:   'product_id',
      as:         'products',
    });
    care_wh_suppliers.hasMany(models.care_wh_purchase_orders, {
      foreignKey: 'supplier_id',
      as:         'purchaseOrders',
    });
  };

  return care_wh_suppliers;
};
