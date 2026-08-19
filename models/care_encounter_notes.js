
// models/care_encounter_notes.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_notes = sequelize.define('care_encounter_notes', {
    nr: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    facility_id:            { type: DataTypes.INTEGER, allowNull: false },
    type_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: false },
    short_notes: { type: DataTypes.STRING(25), allowNull: true },
    aux_notes: { type: DataTypes.STRING(255), allowNull: true },
    ref_notes_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    staff_nr: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    staff_name: { type: DataTypes.STRING(60), allowNull: false },
    send_to_pid: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    send_to_name: { type: DataTypes.STRING(60), allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    time: { type: DataTypes.TIME, allowNull: true },
    location_type: { type: DataTypes.STRING(35), allowNull: true },
    location_type_nr: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    location_nr: { type: DataTypes.MEDIUMINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    location_id: { type: DataTypes.STRING(60), allowNull: true },
    ack_short_id: { type: DataTypes.STRING(10), allowNull: false },
    date_ack: { type: DataTypes.DATE, allowNull: true },
    date_checked: { type: DataTypes.DATE, allowNull: true },
    date_printed: { type: DataTypes.DATE, allowNull: true },
    send_by_mail: { type: DataTypes.TINYINT, allowNull: true },
    send_by_email: { type: DataTypes.TINYINT, allowNull: true },
    send_by_fax: { type: DataTypes.TINYINT, allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_notes',
    timestamps: false,
    indexes: [
      { name: 'idx_facility_id', fields: ['facility_id'] },
    ],
  });

  return care_encounter_notes;
};

