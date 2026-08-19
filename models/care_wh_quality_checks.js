// models/care_wh_quality_checks.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_quality_checks = sequelize.define('care_wh_quality_checks', {
    qc_id:              { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    delivery_item_id:   { type: DataTypes.INTEGER,    allowNull: false },
    checked_by:         { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    checked_at:         { type: DataTypes.DATE,       allowNull: false },
    result:             { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pass' },
    quantity_accepted:  { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    quantity_rejected:  { type: DataTypes.INTEGER,    allowNull: false, defaultValue: 0 },
    rejection_reason:   { type: DataTypes.TEXT,       allowNull: true },
    temperature_ok:     { type: DataTypes.TINYINT,    allowNull: true },
    notes:              { type: DataTypes.TEXT,       allowNull: true },
  }, { tableName: 'care_wh_quality_checks', timestamps: false });
  care_wh_quality_checks.associate = (models) => {
    care_wh_quality_checks.belongsTo(models.care_wh_delivery_items, { foreignKey: 'delivery_item_id', as: 'deliveryItem' });
  };
  return care_wh_quality_checks;
};
