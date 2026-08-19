// models/care_med_orderlist.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_med_orderlist = sequelize.define('care_med_orderlist', {
    order_nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    dept_nr: { type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
    store_type: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'warehouse' },
    order_date: { type: DataTypes.DATEONLY, allowNull: false },
    order_time: { type: DataTypes.TIME, allowNull: false },
    articles: { type: DataTypes.TEXT, allowNull: false },
    extra1: { type: DataTypes.TEXT, allowNull: false },
    extra2: { type: DataTypes.TEXT, allowNull: false },
    validator: { type: DataTypes.TEXT, allowNull: false },
    ip_addr: { type: DataTypes.TEXT, allowNull: false },
    priority: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(25), allowNull: false },
    history: { type: DataTypes.TEXT, allowNull: false },
    modify_id: { type: DataTypes.STRING(35), allowNull: false },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false },
    create_time: { type: DataTypes.DATE, allowNull: false },
    sent_datetime: { type: DataTypes.DATE, allowNull: false },
    process_datetime: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_med_orderlist',
    timestamps: false,
  });

  return care_med_orderlist;
};