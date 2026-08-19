
// models/care_user_facilities.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_user_facilities = sequelize.define('care_user_facilities', {
    id:          { type: DataTypes.INTEGER,          primaryKey: true, autoIncrement: true },
    user_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    facility_id: { type: DataTypes.INTEGER,          allowNull: false },
    is_default:  { type: DataTypes.TINYINT,          allowNull: false, defaultValue: 0 },
    created_at:  { type: DataTypes.DATE,             allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'care_user_facilities', timestamps: false });

  care_user_facilities.associate = (models) => {
    care_user_facilities.belongsTo(models.User, {
      foreignKey: 'user_id', targetKey: 'user_id', as: 'user', constraints: false,
    });
    care_user_facilities.belongsTo(models.care_facilities, {
      foreignKey: 'facility_id', as: 'facility', constraints: false,
    });
  };
  return care_user_facilities;
};
