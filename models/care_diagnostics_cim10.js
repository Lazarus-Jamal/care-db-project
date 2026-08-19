// models/care_diagnostics_cim10.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_diagnostics_cim10 = sequelize.define('care_diagnostics_cim10', {
    id:            { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    code:          { type: DataTypes.STRING(10),  allowNull: false, unique: true },
    libelle_court: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    libelle_long:  { type: DataTypes.TEXT,        allowNull: true },
    chapitre_id:   { type: DataTypes.STRING(5),   allowNull: true },
    est_terminal:  { type: DataTypes.TINYINT,     allowNull: false, defaultValue: 0 },
    parent_code:   { type: DataTypes.STRING(10),  allowNull: true },
    version_annee: { type: DataTypes.INTEGER,     allowNull: true },
  }, {
    tableName:  'care_diagnostics_cim10',
    timestamps: false,
    indexes: [
      { fields: ['code'] },
      { fields: ['parent_code'] },
      { fields: ['chapitre_id'] },
      { fields: ['est_terminal'] },
    ],
  });
  return care_diagnostics_cim10;
};
