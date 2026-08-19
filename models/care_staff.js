// models/care_staff.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_staff = sequelize.define('care_staff', {
    nr:                 { type: DataTypes.INTEGER,           primaryKey: true, autoIncrement: true },
    short_id:           { type: DataTypes.STRING(10),        allowNull: true },
    pid:                { type: DataTypes.INTEGER.UNSIGNED,  primaryKey: true, allowNull: false },
    job_type_nr:        { type: DataTypes.INTEGER,           primaryKey: true, allowNull: false, defaultValue: 0 },
    facility_id:        { type: DataTypes.INTEGER,           allowNull: true },
    dept_nr:            { type: DataTypes.MEDIUMINT.UNSIGNED, allowNull: true },
    job_function_title: { type: DataTypes.STRING(60),        allowNull: true },
    qualification:      { type: DataTypes.STRING(100),       allowNull: true },
    specialization:     { type: DataTypes.STRING(100),       allowNull: true },
    license_nr:         { type: DataTypes.STRING(50),        allowNull: true },
    date_join:          { type: DataTypes.DATEONLY,          allowNull: true },
    status:             { type: DataTypes.STRING(20),        allowNull: true },
  }, {
    tableName:  'care_staff',
    timestamps: false,
  });

  care_staff.associate = (models) => {
    care_staff.belongsTo(models.care_person, {
      foreignKey:  'pid',
      targetKey:   'pid',
      as:          'person',
      constraints: false,
    });
    care_staff.belongsTo(models.care_facilities, {
      foreignKey:  'facility_id',
      as:          'facility',
      constraints: false,
    });
    care_staff.belongsTo(models.care_department, {
      foreignKey:  'dept_nr',
      targetKey:   'nr',
      as:          'department',
      constraints: false,
    });
  };

  return care_staff;
};
