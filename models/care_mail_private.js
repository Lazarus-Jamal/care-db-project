// models/care_mail_private.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_mail_private = sequelize.define('care_mail_private', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recipient: { type: DataTypes.STRING(60), allowNull: false },
    sender: { type: DataTypes.STRING(60), allowNull: false },
    sender_ip: { type: DataTypes.STRING(60), allowNull: false },
    cc: { type: DataTypes.STRING(255), allowNull: false },
    bcc: { type: DataTypes.STRING(255), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    sign: { type: DataTypes.STRING(255), allowNull: false },
    ask4ack: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    reply2: { type: DataTypes.STRING(255), allowNull: false },
    attachment: { type: DataTypes.STRING(255), allowNull: false },
    attach_type: { type: DataTypes.STRING(30), allowNull: false },
    read_flag: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    mailgroup: { type: DataTypes.STRING(60), allowNull: false },
    maildir: { type: DataTypes.STRING(60), allowNull: false },
    exec_level: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    exclude_addr: { type: DataTypes.TEXT, allowNull: false },
    send_dt: { type: DataTypes.DATE, allowNull: false },
    send_stamp: { type: DataTypes.DATE, allowNull: false },
    uid: { type: DataTypes.STRING(255), allowNull: false },
  }, {
    tableName:  'care_mail_private',
    timestamps: false,
  });

  return care_mail_private;
};