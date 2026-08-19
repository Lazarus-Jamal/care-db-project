
// models/care_facility_departments.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_facility_departments = sequelize.define('care_facility_departments', {
    id:          { type: DataTypes.INTEGER,             primaryKey: true, autoIncrement: true },
    facility_id: { type: DataTypes.INTEGER,              allowNull: false },
    dept_nr:     { type: DataTypes.MEDIUMINT.UNSIGNED,   allowNull: false }, // references care_department.nr
    is_active:   { type: DataTypes.TINYINT,              allowNull: false, defaultValue: 1 },
    created_at:  { type: DataTypes.DATE,                 allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'care_facility_departments',
    timestamps: false,
    indexes: [
      { name: 'uniq_facility_dept', unique: true, fields: ['facility_id', 'dept_nr'] },
      { name: 'idx_facility_dept_facility', fields: ['facility_id'] },
      { name: 'idx_facility_dept_dept', fields: ['dept_nr'] },
    ],
  });

  care_facility_departments.associate = (models) => {
    care_facility_departments.belongsTo(models.care_facilities, {
      foreignKey: 'facility_id', as: 'facility', constraints: false,
    });
    care_facility_departments.belongsTo(models.care_department, {
      foreignKey: 'dept_nr', targetKey: 'nr', as: 'department', constraints: false,
    });
  };
  return care_facility_departments;
};
