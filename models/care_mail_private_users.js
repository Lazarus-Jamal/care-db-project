// models/care_mail_private_users.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_mail_private_users = sequelize.define('care_mail_private_users', {
    user_name: { type: DataTypes.STRING(60), allowNull: false },
    email: { type: DataTypes.STRING(60), primaryKey: true },
    alias: { type: DataTypes.STRING(60), allowNull: false },
    pw: { type: DataTypes.STRING(255), allowNull: false },
    inbox: { type: DataTypes.TEXT, allowNull: false },
    sent: { type: DataTypes.TEXT, allowNull: false },
    drafts: { type: DataTypes.TEXT, allowNull: false },
    trash: { type: DataTypes.TEXT, allowNull: false },
    lastcheck: { type: DataTypes.DATE, allowNull: false },
    lock_flag: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    addr_book: { type: DataTypes.TEXT, allowNull: false },
    addr_quick: { type: DataTypes.TEXT, allowNull: false },
    secret_q: { type: DataTypes.TEXT, allowNull: false },
    secret_q_ans: { type: DataTypes.TEXT, allowNull: false },
    public: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    sig: { type: DataTypes.TEXT, allowNull: false },
    append_sig: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_mail_private_users',
    timestamps: false,
  });

  return care_mail_private_users;
};