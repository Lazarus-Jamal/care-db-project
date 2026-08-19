
// models/care_pharma_inventory_counts.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_pharma_inventory_counts = sequelize.define('care_pharma_inventory_counts', {
    count_id:     { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    count_number: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    pharmacy_unit_id: { type: DataTypes.INTEGER, allowNull: true },
    count_type:   { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'full' },
    status:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    count_date:   { type: DataTypes.DATEONLY,   allowNull: false },
    initiated_by: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    approved_by:  { type: DataTypes.STRING(60), allowNull: true },
    approved_at:  { type: DataTypes.DATE,       allowNull: true },
    is_locked:    { type: DataTypes.TINYINT,    allowNull: false, defaultValue: 0 },
    notes:        { type: DataTypes.TEXT,       allowNull: true },
    create_time:  { type: DataTypes.DATE,       allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'care_pharma_inventory_counts',
    timestamps: false,
    indexes: [
      { name: 'idx_counts_unit', fields: ['pharmacy_unit_id'] },
    ],
  });

  care_pharma_inventory_counts.associate = (models) => {
    care_pharma_inventory_counts.hasMany(models.care_pharma_inventory_count_items,
      { foreignKey: 'count_id', as: 'items' });
  };
  return care_pharma_inventory_counts;
};
