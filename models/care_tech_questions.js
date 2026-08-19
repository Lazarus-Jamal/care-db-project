// models/care_tech_questions.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_tech_questions = sequelize.define('care_tech_questions', {
    batch_nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    dept: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    query: { type: DataTypes.TEXT, allowNull: false },
    inquirer: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    tphone: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    tdate: { type: DataTypes.DATEONLY, allowNull: true },
    ttime: { type: DataTypes.TIME, allowNull: true },
    tid: { type: DataTypes.DATE, allowNull: false },
    reply: { type: DataTypes.TEXT, allowNull: false },
    answered: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    ansby: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    astamp: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '' },
    archive: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_tech_questions',
    timestamps: false,
  });

  return care_tech_questions;
};