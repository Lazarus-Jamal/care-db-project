// models/care_news_article.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_news_article = sequelize.define('care_news_article', {
    nr: { type: DataTypes.STRING, primaryKey: true, autoIncrement: true },
    dept_nr: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    category: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pending' },
    title: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    preface: { type: DataTypes.TEXT, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    pic: { type: DataTypes.BLOB, allowNull: true },
    art_num: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    pic_file: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    author: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    submit_date: { type: DataTypes.DATE, allowNull: false },
    publish_date: { type: DataTypes.DATEONLY, allowNull: true },
    modify_id: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_news_article',
    timestamps: false,
  });

  return care_news_article;
};