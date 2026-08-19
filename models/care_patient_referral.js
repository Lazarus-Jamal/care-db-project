
// models/care_patient_referral.js
// Patient Referral System -- scoped in MULTI_FACILITY_IMPLEMENTATION_PLAN.md
// section 2.5 as part of Multi-Facility Phase 2, never actually built until
// now. A referral is a workflow SIGNAL between facilities ("expect this
// patient, here's why, here's urgency") -- it is NOT a data-access gate.
// Cross-facility clinical history is already visible for continuity of
// care (see the Plan's section 5 item 2, confirmed decision) independent
// of whether a referral exists at all.
//
// to_encounter_nr is a deliberate addition beyond the original section 2.5
// spec -- the original only had from_encounter_nr, with no way to link
// back to the encounter that results once the referred patient actually
// shows up. Set manually by receiving staff when marking a referral
// 'seen'; confirmed NOT automated (no code watches for new encounters to
// auto-fire this transition).
'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const care_patient_referral = sequelize.define('care_patient_referral', {
    id:                { type: DataTypes.INTEGER,          primaryKey: true, autoIncrement: true },
    pid:               { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    from_facility_id:  { type: DataTypes.INTEGER,          allowNull: false },
    to_facility_id:    { type: DataTypes.INTEGER,          allowNull: false },
    from_encounter_nr: { type: DataTypes.BIGINT.UNSIGNED,  allowNull: true },
    to_encounter_nr:   { type: DataTypes.BIGINT.UNSIGNED,  allowNull: true },
    reason:            { type: DataTypes.TEXT,             allowNull: false },
    urgency:           { type: DataTypes.STRING(20),       allowNull: false, defaultValue: 'routine' },
    status:            { type: DataTypes.STRING(20),       allowNull: false, defaultValue: 'sent' },
    referring_staff:   { type: DataTypes.STRING(60),       allowNull: false },
    receiving_staff:   { type: DataTypes.STRING(60),       allowNull: true },
    decline_reason:    { type: DataTypes.TEXT,             allowNull: true },
    receiving_notes:   { type: DataTypes.TEXT,             allowNull: true },
    created_at:        { type: DataTypes.DATE,             allowNull: false, defaultValue: DataTypes.NOW },
    updated_at:        { type: DataTypes.DATE,             allowNull: true },
  }, {
    tableName: 'care_patient_referral',
    timestamps: false,
    indexes: [
      { name: 'idx_referral_to_facility_status', fields: ['to_facility_id', 'status'] },
      { name: 'idx_referral_from_facility_status', fields: ['from_facility_id', 'status'] },
      { name: 'idx_referral_pid', fields: ['pid'] },
    ],
  });

  care_patient_referral.associate = (models) => {
    care_patient_referral.belongsTo(models.care_person, {
      foreignKey: 'pid', as: 'patient', constraints: false,
    });
    care_patient_referral.belongsTo(models.care_facilities, {
      foreignKey: 'from_facility_id', as: 'fromFacility', constraints: false,
    });
    care_patient_referral.belongsTo(models.care_facilities, {
      foreignKey: 'to_facility_id', as: 'toFacility', constraints: false,
    });
    care_patient_referral.belongsTo(models.care_encounter, {
      foreignKey: 'from_encounter_nr', as: 'fromEncounter', constraints: false,
    });
    care_patient_referral.belongsTo(models.care_encounter, {
      foreignKey: 'to_encounter_nr', as: 'toEncounter', constraints: false,
    });
  };
  return care_patient_referral;
};
