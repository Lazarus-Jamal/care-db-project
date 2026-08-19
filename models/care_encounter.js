
// models/care_encounter.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter = sequelize.define('care_encounter', {
    encounter_nr:           { type: DataTypes.BIGINT.UNSIGNED,   primaryKey: true, autoIncrement: true },
    facility_id:            { type: DataTypes.INTEGER, allowNull: false },
    pid:                    { type: DataTypes.INTEGER.UNSIGNED,  allowNull: false, defaultValue: 0 },
    encounter_date:         { type: DataTypes.DATE,              allowNull: true },
    encounter_class_nr:     { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    encounter_type:         { type: DataTypes.STRING(35),        allowNull: false, defaultValue: '' },
    encounter_status:       { type: DataTypes.STRING(35),        allowNull: false, defaultValue: '' },
    referrer_diagnosis:     { type: DataTypes.STRING(255),       allowNull: true,  defaultValue: null },
    referrer_recom_therapy: { type: DataTypes.STRING(255),       allowNull: true },
    referrer_dr:            { type: DataTypes.STRING(60),        allowNull: true,  defaultValue: null },
    referrer_dept:          { type: DataTypes.STRING(255),       allowNull: false, defaultValue: '' },
    referrer_institution:   { type: DataTypes.STRING(255),       allowNull: true,  defaultValue: null },
    referrer_notes:         { type: DataTypes.TEXT,              allowNull: true },
    financial_class_nr:     { type: DataTypes.TINYINT.UNSIGNED,  allowNull: false, defaultValue: 0 },
    insurance_nr:           { type: DataTypes.STRING(25),        allowNull: true },
    insurance_firm_id:      { type: DataTypes.STRING(25),        allowNull: false, defaultValue: '' },
    insurance_firm:         { type: DataTypes.STRING(255),       allowNull: false, defaultValue: '' },
    insurance_class_nr:     { type: DataTypes.TINYINT.UNSIGNED,  allowNull: false, defaultValue: 0 },
    insurance_2_nr:         { type: DataTypes.STRING(25),        allowNull: true },
    insurance_2_firm_id:    { type: DataTypes.STRING(25),        allowNull: false, defaultValue: '' },
    insurance_provider_id:  { type: DataTypes.INTEGER,           allowNull: true },
    guarantor_pid:          { type: DataTypes.INTEGER,           allowNull: false, defaultValue: 0 },
    contact_pid:            { type: DataTypes.INTEGER,           allowNull: false, defaultValue: 0 },
    contact_name:           { type: DataTypes.STRING(255),       allowNull: true,  defaultValue: null },
    contact_relation:       { type: DataTypes.STRING(35),        allowNull: false, defaultValue: '' },
    current_ward_nr:        { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    current_room_nr:        { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    in_ward:                { type: DataTypes.TINYINT,           allowNull: false, defaultValue: 0 },
    current_dept_nr:        { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    in_dept:                { type: DataTypes.TINYINT,           allowNull: false, defaultValue: 0 },
    current_firm_nr:        { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    current_att_dr_nr:      { type: DataTypes.INTEGER,           allowNull: false, defaultValue: 0 },
    consulting_dr:          { type: DataTypes.STRING(60),        allowNull: false, defaultValue: '' },
    extra_service:          { type: DataTypes.STRING(25),        allowNull: false, defaultValue: '' },
    is_discharged:          { type: DataTypes.TINYINT.UNSIGNED,  allowNull: false, defaultValue: 0 },
    discharge_date:         { type: DataTypes.DATEONLY,          allowNull: true },
    discharge_time:         { type: DataTypes.TIME,              allowNull: true },
    followup_date:          { type: DataTypes.DATEONLY,          allowNull: true },
    followup_responsibility:{ type: DataTypes.STRING(255),       allowNull: true },
    post_encounter_notes:   { type: DataTypes.TEXT,              allowNull: true },
    status:                 { type: DataTypes.STRING(25),        allowNull: false, defaultValue: '' },
    history:                { type: DataTypes.TEXT,              allowNull: true },
    modify_id:              { type: DataTypes.STRING(35),        allowNull: false, defaultValue: '' },
    modify_time:            { type: DataTypes.DATE,              allowNull: false, defaultValue: DataTypes.NOW },
    create_id:              { type: DataTypes.STRING(35),        allowNull: false, defaultValue: '' },
    create_time:            { type: DataTypes.DATE,              allowNull: false, defaultValue: DataTypes.NOW },
    quality:                { type: DataTypes.STRING(15),        allowNull: false, defaultValue: '' },
    boncfg:                 { type: DataTypes.TINYINT,           allowNull: false, defaultValue: 0 },
    exclusion:              { type: DataTypes.TINYINT,           allowNull: false, defaultValue: 0 },
    exclusion2:             { type: DataTypes.TINYINT,           allowNull: false, defaultValue: 0 },
    bonpercent:             { type: DataTypes.TINYINT,           allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_encounter',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
    ],
  });

  care_encounter.associate = (models) => {
    care_encounter.belongsTo(models.care_person, {
      foreignKey: 'pid', targetKey: 'pid',
      as: 'patient', constraints: false,
    });
    // Encounter → Facility (Multi-Facility Phase 2)
    care_encounter.belongsTo(models.care_facilities, {
      foreignKey: 'facility_id', as: 'facility', constraints: false,
    });
    // Encounter → Department (for displaying dept name)
    care_encounter.belongsTo(models.care_department, {
      foreignKey:  'current_dept_nr',
      targetKey:   'nr',
      as:          'department',
      constraints: false,
    });
    // Encounter → Prescriptions
    care_encounter.hasMany(models.care_encounter_prescription, {
      foreignKey:  'encounter_nr',
      as:          'prescriptions',
      constraints: false,
    });
    // Encounter → Diagnoses
    care_encounter.hasMany(models.care_encounter_diagnosis, {
      foreignKey:  'encounter_nr',
      as:          'diagnoses',
      constraints: false,
    });
  };

  return care_encounter;
};






