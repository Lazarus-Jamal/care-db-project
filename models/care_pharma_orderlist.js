// models/care_pharma_orderlist.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_pharma_orderlist = sequelize.define('care_pharma_orderlist', {
    order_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false },
    dept_nr: { primaryKey: true, type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    order_date: { type: DataTypes.DATEONLY, allowNull: true },
    order_time: { type: DataTypes.TIME, allowNull: true },
    articles: { type: DataTypes.TEXT, allowNull: true },
    extra1: { type: DataTypes.TEXT, allowNull: true },
    extra2: { type: DataTypes.TEXT, allowNull: true },
    validator: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    ip_addr: { type: DataTypes.STRING(45), allowNull: false, defaultValue: '' },
    priority: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    history: { type: DataTypes.TEXT, allowNull: true },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
    sent_datetime: { type: DataTypes.DATE, allowNull: true },
    process_datetime: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName:  'care_pharma_orderlist',
    timestamps: false,
  });

  return care_pharma_orderlist;
};