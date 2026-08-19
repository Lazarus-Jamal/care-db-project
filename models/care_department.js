// models/care_department.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_department = sequelize.define('care_department', {
    nr:               { type: DataTypes.MEDIUMINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    id:               { type: DataTypes.STRING(60),   allowNull: false, defaultValue: '' },
    type:             { type: DataTypes.STRING(25),   allowNull: false, defaultValue: '' },
    name_formal:      { type: DataTypes.STRING(60),   allowNull: false, defaultValue: '' },
    name_short:       { type: DataTypes.STRING(35),   allowNull: false, defaultValue: '' },
    name_alternate:   { type: DataTypes.STRING(225),  allowNull: true },
    LD_var:           { type: DataTypes.STRING(35),   allowNull: false, defaultValue: '' },
    description:      { type: DataTypes.TEXT,         allowNull: false },
    admit_inpatient:  { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 0 },
    admit_outpatient: { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 0 },
    has_oncall_doc:   { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 1 },
    has_oncall_nurse: { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 1 },
    does_surgery:     { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 0 },
    this_institution: { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 1 },
    is_sub_dept:      { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 0 },
    parent_dept_nr:   { type: DataTypes.TINYINT.UNSIGNED, allowNull: true, defaultValue: 0 },
    work_hours:       { type: DataTypes.STRING(100),  allowNull: true },
    consult_hours:    { type: DataTypes.STRING(100),  allowNull: true },
    is_inactive:      { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 0 },
    sort_order:       { type: DataTypes.TINYINT.UNSIGNED, allowNull: true, defaultValue: 0 },
    address:          { type: DataTypes.TEXT,         allowNull: true },
    sig_line:         { type: DataTypes.STRING(60),   allowNull: true },
    sig_stamp:        { type: DataTypes.TEXT,         allowNull: true },
    logo_mime_type:   { type: DataTypes.STRING(5),    allowNull: true },
    status:           { type: DataTypes.STRING(25),   allowNull: false, defaultValue: '' },
    history:          { type: DataTypes.TEXT,         allowNull: true },
    modify_id:        { type: DataTypes.STRING(35),   allowNull: false, defaultValue: '' },
    modify_time:      { type: DataTypes.DATE,         allowNull: false },
    create_id:        { type: DataTypes.STRING(35),   allowNull: false, defaultValue: '' },
    create_time:      { type: DataTypes.DATE,         allowNull: false },
    is_pharmacy:      { type: DataTypes.TINYINT,      allowNull: false, defaultValue: 0 },
    pharma_dept_nr:   { type: DataTypes.TINYINT.UNSIGNED, allowNull: true, defaultValue: 0 },
  }, {
    tableName:  'care_department',
    timestamps: false,
  });

  care_department.associate = (models) => {
    care_department.hasMany(models.User, {
      foreignKey:  'dept_nr',
      sourceKey:   'nr',
      as:          'users',
      constraints: false,
    });
    care_department.hasMany(models.care_staff, {
      foreignKey:  'dept_nr',
      sourceKey:   'nr',
      as:          'staff_members',
      constraints: false,
    });
  };

  return care_department;
};
