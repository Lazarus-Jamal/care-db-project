// models/care_facilities.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_facilities = sequelize.define('care_facilities', {
    id:                 { type: DataTypes.INTEGER,        primaryKey: true, autoIncrement: true },
    name:               { type: DataTypes.STRING(255),    allowNull: false },
    code:               { type: DataTypes.STRING(10),     allowNull: false },
    type:               { type: DataTypes.STRING,         allowNull: false },
    facility_type:      { type: DataTypes.STRING(15),     allowNull: false, defaultValue: 'main' },
    parent_id:          { type: DataTypes.INTEGER,        allowNull: true },
    director_id:        { type: DataTypes.INTEGER,        allowNull: true },
    head_nurse_id:      { type: DataTypes.INTEGER,        allowNull: true },
    finance_officer_id: { type: DataTypes.INTEGER,        allowNull: true },
    address:            { type: DataTypes.TEXT,           allowNull: true },
    city:               { type: DataTypes.STRING(100),    allowNull: true },
    region:             { type: DataTypes.STRING(100),    allowNull: true },
    country:            { type: DataTypes.STRING(100),    allowNull: true, defaultValue: 'Cameroon' },
    email:              { type: DataTypes.STRING(60),     allowNull: true },
    phone:              { type: DataTypes.STRING(35),     allowNull: true },
    latitude:           { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    longitude:          { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    status:             { type: DataTypes.STRING(25),     allowNull: false, defaultValue: 'active' },
    modify_id:          { type: DataTypes.STRING(35),     allowNull: false, defaultValue: '' },
    // defaultValue: DataTypes.NOW tells Sequelize to supply NOW() if not provided
    modify_time:        { type: DataTypes.DATE,           allowNull: false, defaultValue: DataTypes.NOW },
    create_id:          { type: DataTypes.STRING(35),     allowNull: false, defaultValue: '' },
    create_time:        { type: DataTypes.DATE,           allowNull: false, defaultValue: DataTypes.NOW },
    created_at:         { type: DataTypes.DATE,           allowNull: true },
    updated_at:         { type: DataTypes.DATE,           allowNull: true },
  }, {
    tableName:  'care_facilities',
    timestamps: false,
  });

  care_facilities.associate = (models) => {
    care_facilities.belongsTo(models.care_facilities, {
      foreignKey: 'parent_id', as: 'parentFacility', constraints: false,
    });
    care_facilities.hasMany(models.care_facilities, {
      foreignKey: 'parent_id', as: 'satellites', constraints: false,
    });
    care_facilities.hasMany(models.care_staff, {
      foreignKey: 'facility_id', as: 'staff', constraints: false,
    });
    care_facilities.belongsTo(models.care_staff, {
      foreignKey: 'director_id', targetKey: 'nr', as: 'director', constraints: false,
    });
    care_facilities.belongsTo(models.care_staff, {
      foreignKey: 'head_nurse_id', targetKey: 'nr', as: 'headNurse', constraints: false,
    });
    care_facilities.belongsTo(models.care_staff, {
      foreignKey: 'finance_officer_id', targetKey: 'nr', as: 'financeOfficer', constraints: false,
    });
    care_facilities.hasMany(models.User, {
      foreignKey: 'facility_id', as: 'users', constraints: false,
    });
  };

  return care_facilities;
};
