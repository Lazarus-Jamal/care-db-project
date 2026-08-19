
// models/care_pharmacy_unit.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_pharmacy_unit = sequelize.define('care_pharmacy_unit', {
    id:          { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    facility_id: { type: DataTypes.INTEGER,       allowNull: false },
    name:        { type: DataTypes.STRING(50),    allowNull: false },
    unit_type:   { type: DataTypes.STRING(10),    allowNull: false, defaultValue: 'single' }, // single | day | night
    location:    { type: DataTypes.STRING(150),   allowNull: true },
    is_active:   { type: DataTypes.TINYINT,       allowNull: false, defaultValue: 1 },
    created_at:  { type: DataTypes.DATE,          allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'care_pharmacy_unit',
    timestamps: false,
    // Declared explicitly so the index exists even if this table is ever
    // created via Sequelize sync rather than the raw migration SQL — see
    // migration_pharma_inventory_counts and care_user_facilities for why
    // this matters: relying on sync alone silently skipped these before.
    indexes: [
      { name: 'idx_pharmacy_unit_facility', fields: ['facility_id'] },
    ],
  });

  care_pharmacy_unit.associate = (models) => {
    care_pharmacy_unit.belongsTo(models.care_facilities, {
      foreignKey: 'facility_id', as: 'facility', constraints: false,
    });
    care_pharmacy_unit.hasMany(models.care_pharmacy_stock, {
      foreignKey: 'pharmacy_unit_id', as: 'stock', constraints: false,
    });
    care_pharmacy_unit.hasMany(models.care_pharmacy_shelf, {
      foreignKey: 'pharmacy_unit_id', as: 'shelves', constraints: false,
    });
  };
  return care_pharmacy_unit;
};
