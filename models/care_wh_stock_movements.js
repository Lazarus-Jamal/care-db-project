// models/care_wh_stock_movements.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_stock_movements = sequelize.define('care_wh_stock_movements', {
    movement_id:    { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    product_id:     { type: DataTypes.INTEGER,     allowNull: false },
    stock_id:       { type: DataTypes.INTEGER,     allowNull: true },
    movement_type:  { type: DataTypes.STRING(30),  allowNull: false, defaultValue: '' },
    quantity:       { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
    reference_id:   { type: DataTypes.INTEGER,     allowNull: true },
    reference_type: { type: DataTypes.STRING(30),  allowNull: true },
    batch_number:   { type: DataTypes.STRING(100), allowNull: true },
    expiry_date:    { type: DataTypes.DATEONLY,    allowNull: true },
    performed_by:   { type: DataTypes.STRING(60),  allowNull: false, defaultValue: '' },
    performed_at:   { type: DataTypes.DATE,        allowNull: false },
    notes:          { type: DataTypes.TEXT,        allowNull: true },
  }, { tableName: 'care_wh_stock_movements', timestamps: false });
  care_wh_stock_movements.associate = (models) => {
    care_wh_stock_movements.belongsTo(models.care_wh_products, { foreignKey: 'product_id', as: 'product' });
  };
  return care_wh_stock_movements;
};
