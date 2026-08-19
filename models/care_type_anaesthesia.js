// models/care_type_anaesthesia.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_type_anaesthesia = sequelize.define('care_type_anaesthesia', {
    nr: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    name: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    LD_var: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(25), allowNull: false, defaultValue: '' },
    modify_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    modify_time: { type: DataTypes.DATE, allowNull: false },
    create_id: { type: DataTypes.STRING(35), allowNull: false, defaultValue: '' },
    create_time: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName:  'care_type_anaesthesia',
    timestamps: false,
  });

  return care_type_anaesthesia;
};