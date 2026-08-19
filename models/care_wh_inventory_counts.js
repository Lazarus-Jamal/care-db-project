// models/care_wh_inventory_counts.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_wh_inventory_counts = sequelize.define('care_wh_inventory_counts', {
    count_id:     { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    count_number: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    count_type:   { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'monthly' },
    status:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    count_date:   { type: DataTypes.DATEONLY,   allowNull: false },
    initiated_by: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    approved_by:  { type: DataTypes.STRING(60), allowNull: true },
    approved_at:  { type: DataTypes.DATE,       allowNull: true },
    is_locked:    { type: DataTypes.TINYINT,    allowNull: false, defaultValue: 0 },
    notes:        { type: DataTypes.TEXT,       allowNull: true },
    create_time:  { type: DataTypes.DATE,       allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'care_wh_inventory_counts', timestamps: false });

  care_wh_inventory_counts.associate = (models) => {
    care_wh_inventory_counts.hasMany(models.care_wh_inventory_count_items,
      { foreignKey: 'count_id', as: 'items' });
  };
  return care_wh_inventory_counts;
};
