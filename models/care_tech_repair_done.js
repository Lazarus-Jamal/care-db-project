// models/care_tech_repair_done.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_tech_repair_done = sequelize.define('care_tech_repair_done', {
    batch_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false },
    dept: { type: DataTypes.STRING(15), allowNull: true },
    dept_nr: { primaryKey: true, type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    job_id: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 0 },
    job: { type: DataTypes.TEXT, allowNull: false },
    reporter: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    id: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    tdate: { type: DataTypes.DATEONLY, allowNull: true },
    ttime: { type: DataTypes.TIME, allowNull: true },
    tid: { type: DataTypes.DATE, allowNull: false },
    seen: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    d_idx: { type: DataTypes.STRING(8), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_tech_repair_done',
    timestamps: false,
  });

  return care_tech_repair_done;
};