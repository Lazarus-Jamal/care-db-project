// models/user.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    user_id:    { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    username:   { type: DataTypes.STRING(255), allowNull: false },
    email:      { type: DataTypes.STRING(255), allowNull: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    dept_nr:    { type: DataTypes.MEDIUMINT.UNSIGNED, allowNull: true },
    staff_nr:   { type: DataTypes.INTEGER,     allowNull: true },
    is_active:  { type: DataTypes.TINYINT,     allowNull: true,  defaultValue: 1 },
    last_login: { type: DataTypes.DATE,        allowNull: true },
    // These columns exist in DB as NOT NULL — supply defaultValue so
    // Sequelize doesn't throw notNull violation before the DB default fires
    created_at: { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
    role_id:    { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
    facility_id:{ type: DataTypes.INTEGER,     allowNull: true },
    created_by: { type: DataTypes.INTEGER,     allowNull: true },
    pid:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_admin:   { type: DataTypes.TINYINT,     allowNull: false, defaultValue: 0 },
  }, {
    tableName:  'care_users',
    timestamps: false,
  });

  User.associate = (models) => {
    User.belongsTo(models.care_users_roles, {
      foreignKey: 'role_id', as: 'userRole', constraints: false,
    });
    User.belongsTo(models.care_department, {
      foreignKey: 'dept_nr', targetKey: 'nr', as: 'department', constraints: false,
    });
    User.belongsTo(models.care_staff, {
      foreignKey: 'staff_nr', as: 'staff', constraints: false,
    });
    User.belongsTo(models.care_facilities, {
      foreignKey: 'facility_id', as: 'facility', constraints: false,
    });
    User.belongsTo(models.care_person, {
      foreignKey: 'pid', targetKey: 'pid', as: 'personData', constraints: false,
    });
  };

  return User;
};
