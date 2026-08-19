// models/care_wh_reimb_receipts.js
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const m = sequelize.define('care_wh_reimb_receipts', {
    receipt_id:    { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    reimb_id:      { type: DataTypes.INTEGER,     allowNull: false },
    filename:      { type: DataTypes.STRING(255), allowNull: false },
    original_name: { type: DataTypes.STRING(255), allowNull: false },
    file_path:     { type: DataTypes.STRING(500), allowNull: false },
    uploaded_by:   { type: DataTypes.STRING(60),  allowNull: false },
    uploaded_at:   { type: DataTypes.DATE,        allowNull: false },
  }, { tableName: 'care_wh_reimb_receipts', timestamps: false });

  m.associate = (models) => {
    m.belongsTo(models.care_wh_reimbursement_requests,
      { foreignKey: 'reimb_id', as: 'reimbursement' });
  };
  return m;
};
