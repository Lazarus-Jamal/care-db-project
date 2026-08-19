// models/care_wh_product_categories.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_wh_product_categories = sequelize.define('care_wh_product_categories', {
    category_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    parent_id:   { type: DataTypes.INTEGER,     allowNull: true  },
    description: { type: DataTypes.TEXT,        allowNull: true  },
    is_active:   { type: DataTypes.TINYINT,     allowNull: false, defaultValue: 1 },
    create_time: { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName:  'care_wh_product_categories',
    timestamps: false,
  });

  care_wh_product_categories.associate = (models) => {
    // Self-reference: subcategory -> parent
    care_wh_product_categories.belongsTo(care_wh_product_categories, {
      foreignKey: 'parent_id',
      as:         'parent',
      constraints: false,
    });
    care_wh_product_categories.hasMany(care_wh_product_categories, {
      foreignKey: 'parent_id',
      as:         'subcategories',
      constraints: false,
    });
    care_wh_product_categories.hasMany(models.care_wh_products, {
      foreignKey: 'category_id',
      as:         'products',
    });
  };

  return care_wh_product_categories;
};
