// models/care_encounter_image.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_encounter_image = sequelize.define('care_encounter_image', {
    nr: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    encounter_nr: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    shot_date: { type: DataTypes.DATEONLY, allowNull: false },
    shot_nr: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    mime_type: { type: DataTypes.STRING(10), allowNull: false },
    upload_date: { type: DataTypes.DATEONLY, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: false },
    graphic_script: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_encounter_image',
    timestamps: false,
  });

  return care_encounter_image;
};