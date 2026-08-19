// models/care_person.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_person = sequelize.define('care_person', {
    pid:                { type: DataTypes.INTEGER.UNSIGNED,  primaryKey: true, autoIncrement: true },
    hospital_file_nr:   { type: DataTypes.STRING(50),        allowNull: true },
    date_reg:           { type: DataTypes.DATE,              allowNull: true },
    name_first:         { type: DataTypes.STRING(60),        allowNull: true },
    name_2:             { type: DataTypes.STRING(60),        allowNull: true },
    name_3:             { type: DataTypes.STRING(60),        allowNull: true },
    name_middle:        { type: DataTypes.STRING(60),        allowNull: true },
    name_last:          { type: DataTypes.STRING(60),        allowNull: true },
    name_maiden:        { type: DataTypes.STRING(60),        allowNull: true },
    name_others:        { type: DataTypes.TEXT,              allowNull: true },
    date_birth:         { type: DataTypes.DATEONLY,          allowNull: true },
    blood_group:        { type: DataTypes.STRING(2),         allowNull: true },
    addr_str:           { type: DataTypes.STRING(60),        allowNull: true },
    addr_str_nr:        { type: DataTypes.STRING(10),        allowNull: true },
    addr_zip:           { type: DataTypes.STRING(15),        allowNull: true },
    addr_citytown_nr:   { type: DataTypes.INTEGER.UNSIGNED,  allowNull: true },
    addr_region:        { type: DataTypes.STRING(60),        allowNull: true },
    addr_country:       { type: DataTypes.STRING(60),        allowNull: true },
    addr_is_valid:      { type: DataTypes.TINYINT,           allowNull: true },
    citizenship:        { type: DataTypes.STRING(35),        allowNull: true },
    phone_1_code:       { type: DataTypes.STRING(15),        allowNull: true },
    phone_1_nr:         { type: DataTypes.STRING(35),        allowNull: true },
    phone_2_code:       { type: DataTypes.STRING(15),        allowNull: true },
    phone_2_nr:         { type: DataTypes.STRING(35),        allowNull: true },
    cellphone_1_nr:     { type: DataTypes.STRING(35),        allowNull: true },
    cellphone_2_nr:     { type: DataTypes.STRING(35),        allowNull: true },
    fax:                { type: DataTypes.STRING(35),        allowNull: true },
    email:              { type: DataTypes.STRING(60),        allowNull: true },
    civil_status:       { type: DataTypes.STRING(35),        allowNull: true },
    sex:                { type: DataTypes.STRING(1),         allowNull: true },
    title:              { type: DataTypes.STRING(25),        allowNull: true },
    photo_filename:     { type: DataTypes.STRING(60),        allowNull: true },
    ethnic_orig:        { type: DataTypes.INTEGER.UNSIGNED,  allowNull: true },
    occupation:         { type: DataTypes.STRING(100),       allowNull: true },
    org_id:             { type: DataTypes.STRING(60),        allowNull: true },
    sss_nr:             { type: DataTypes.STRING(60),        allowNull: true },
    nat_id_nr:          { type: DataTypes.STRING(60),        allowNull: true },
    religion:           { type: DataTypes.STRING(125),       allowNull: true },
    mother_pid:         { type: DataTypes.INTEGER.UNSIGNED,  allowNull: true },
    father_pid:         { type: DataTypes.INTEGER.UNSIGNED,  allowNull: true },
    contact_person:     { type: DataTypes.STRING(255),       allowNull: true },
    contact_pid:        { type: DataTypes.INTEGER.UNSIGNED,  allowNull: true },
    contact_relation:   { type: DataTypes.STRING(25),        allowNull: true },
    death_date:         { type: DataTypes.DATEONLY,          allowNull: true },
    death_encounter_nr: { type: DataTypes.INTEGER.UNSIGNED,  allowNull: true },
    death_cause:        { type: DataTypes.STRING(255),       allowNull: true },
    death_cause_code:   { type: DataTypes.STRING(15),        allowNull: true },
    date_update:        { type: DataTypes.DATE,              allowNull: true },
    status:             { type: DataTypes.STRING(20),        allowNull: true },
    history:            { type: DataTypes.TEXT,              allowNull: true },
    modify_id:          { type: DataTypes.STRING(35),        allowNull: true },
    modify_time:        { type: DataTypes.DATE,              allowNull: true },
    create_id:          { type: DataTypes.STRING(35),        allowNull: true },
    create_time:        { type: DataTypes.DATE,              allowNull: true },
    relative_name_first:{ type: DataTypes.STRING(60),        allowNull: true },
    relative_name_last: { type: DataTypes.STRING(60),        allowNull: true },
    relative_phone:     { type: DataTypes.STRING(35),        allowNull: true },
  }, {
    tableName:  'care_person',
    timestamps: false,
  });

  care_person.associate = (models) => {
    // tribe name via ethnic_orig → tribe_id
    care_person.belongsTo(models.care_tribes, {
      foreignKey:  'ethnic_orig',
      targetKey:   'tribe_id',
      as:          'tribe',
      constraints: false,
    });
    // all encounters for this patient
    care_person.hasMany(models.care_encounter, {
      foreignKey:  'pid',
      sourceKey:   'pid',
      as:          'encounters',
      constraints: false,
    });
  };

  return care_person;
};
