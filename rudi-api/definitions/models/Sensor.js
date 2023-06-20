// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'

// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------
const SensorSchema = new mongoose.Schema(
  {
    sensor: {
      type: String,
    },
  },
  {
    timestamps: true,
    id: false,
  }
)

// -------------------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------------------
export default mongoose.model('Sensor', SensorSchema)
