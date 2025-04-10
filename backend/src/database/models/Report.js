import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    report_date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    report_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'Reports',
    underscored: true,
    indexes: [
      {
        fields: ['patient_id']
      },
      {
        fields: ['report_date']
      },
      {
        fields: ['report_type']
      }
    ]
  });

  return Report;
}; 