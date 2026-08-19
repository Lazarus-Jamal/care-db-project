
// models/care_drugsandservices.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_drugsandservices = sequelize.define('care_drugsandservices', {
    item_id:               { type: DataTypes.BIGINT,         primaryKey: true, autoIncrement: true },
    item_number:           { type: DataTypes.STRING(50),     allowNull: true },
    is_pediatric:          { type: DataTypes.SMALLINT,       allowNull: true, defaultValue: 0 },
    is_adult:              { type: DataTypes.SMALLINT,       allowNull: true, defaultValue: 0 },
    is_other:              { type: DataTypes.SMALLINT,       allowNull: true, defaultValue: 0 },
    is_consumable:         { type: DataTypes.SMALLINT,       allowNull: true, defaultValue: 0 },
    item_description:      { type: DataTypes.STRING(255),    allowNull: true },
    // Renamed from item_full_description in migration
    item_description_en:   { type: DataTypes.STRING(255),    allowNull: true },
    unit_price:            { type: DataTypes.STRING(50),     allowNull: true },
    unit_price_dec:        { type: DataTypes.DECIMAL(15,2),  allowNull: true },
    quantity:              { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    unit_price_2:          { type: DataTypes.STRING(50),     allowNull: true },
    unit_price_2_dec:      { type: DataTypes.DECIMAL(15,2),  allowNull: true },
    unit_price_3:          { type: DataTypes.STRING(50),     allowNull: true },
    purchasing_class:      { type: DataTypes.STRING(50),     allowNull: true },
    store_type:            { type: DataTypes.STRING(15),     allowNull: true },
    Minimumlevel:          { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    ReorderLevel:          { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    Maximumlevel:          { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    unt_price_1:           { type: DataTypes.STRING(50),     allowNull: true },
    pharma1:               { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    pharma2:               { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    pharma3:               { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    pharma4:               { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    mag1:                  { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    mag2:                  { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    is_arv:                { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    oldqty:                { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
    user:                  { type: DataTypes.STRING(50),     allowNull: true },
    datemod:               { type: DataTypes.DATE,           allowNull: true },
  }, {
    tableName:  'care_drugsandservices',
    timestamps: false,
  });

  care_drugsandservices.associate = (models) => {
    // Pharmacy Scoping — the catalog itself stays global; this exposes
    // the per-unit stock rows for whichever units actually carry this
    // item (may be zero, one, or many units).
    care_drugsandservices.hasMany(models.care_pharmacy_stock, {
      foreignKey: 'item_id', as: 'unitStock', constraints: false,
    });
  };
  return care_drugsandservices;
};


