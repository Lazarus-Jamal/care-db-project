// models/care_insurance_firm.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const care_insurance_firm = sequelize.define('care_insurance_firm', {
    firm_id:         { type: DataTypes.STRING(40),  primaryKey: true },
    name:            { type: DataTypes.STRING(60),  allowNull: false },
    iso_country_id:  { type: DataTypes.CHAR(3),     allowNull: true },
    sub_area:        { type: DataTypes.STRING(60),  allowNull: true },
    type_nr:         { type: DataTypes.SMALLINT,    allowNull: true, defaultValue: 0 },
    type_category:   { type: DataTypes.STRING(15),  allowNull: true },
    addr:            { type: DataTypes.STRING(255),  allowNull: true },
    addr_mail:       { type: DataTypes.STRING(200),  allowNull: true },
    addr_billing:    { type: DataTypes.STRING(200),  allowNull: true },
    addr_email:      { type: DataTypes.STRING(60),   allowNull: true },
    phone_main:      { type: DataTypes.STRING(35),   allowNull: true },
    phone_aux:       { type: DataTypes.STRING(35),   allowNull: true },
    contact_person:  { type: DataTypes.STRING(60),   allowNull: true },
    contact_phone:   { type: DataTypes.STRING(35),   allowNull: true },
    contact_email:   { type: DataTypes.STRING(60),   allowNull: true },
    use_frequency:   { type: DataTypes.BIGINT,       allowNull: true, defaultValue: 0 },
    maxpay:          { type: DataTypes.INTEGER,      allowNull: true, defaultValue: 0 },
    exclusion:       { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 0 },
    exclusion2:      { type: DataTypes.TINYINT,      allowNull: true, defaultValue: 0 },
    bp:              { type: DataTypes.STRING(50),   allowNull: true },
    city:            { type: DataTypes.STRING(60),   allowNull: true },
    status:          { type: DataTypes.STRING(25),   allowNull: true },
    modify_id:       { type: DataTypes.STRING(35),   allowNull: true },
    modify_time:     { type: DataTypes.DATE,         allowNull: true },
    create_id:       { type: DataTypes.STRING(35),   allowNull: true },
    create_time:     { type: DataTypes.DATE,         allowNull: true },
  }, {
    tableName:  'care_insurance_firm',
    timestamps: false,
  });
  return care_insurance_firm;
};
