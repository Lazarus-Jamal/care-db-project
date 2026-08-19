// models/care_tech_repair_job.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_tech_repair_job = sequelize.define('care_tech_repair_job', {
    batch_nr: { type: DataTypes.TINYINT, primaryKey: true, autoIncrement: true },
    dept: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    job: { type: DataTypes.TEXT, allowNull: false },
    reporter: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    id: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    tphone: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    tdate: { type: DataTypes.DATEONLY, allowNull: true },
    ttime: { type: DataTypes.TIME, allowNull: true },
    tid: { type: DataTypes.DATE, allowNull: false },
    done: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    seen: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    seenby: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    sstamp: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '' },
    doneby: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    dstamp: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '' },
    d_idx: { type: DataTypes.STRING(8), allowNull: false, defaultValue: '' },
    archive: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_tech_repair_job',
    timestamps: false,
  });

  return care_tech_repair_job;
};