const mod = 'metaSch'
// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
import mongoose from 'mongoose'
// import StateMachine from 'fsm-typescript'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
// import {} from '../../utils/logging.js'

// -------------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------------
enum LocalStates {
  INVALID,
  VALID,
  DELETED,
  DESTROYED,
}

enum Status {
  REQUESTED,
  ABORTED,
  PENDING,
  DECLINED,
  APPROVED,
  COMPLETED,
}

enum DistantStates {
  LOCAL,
  INTEGRATED,
  DELETED,
}

const remoteStateMachineOptions = {
  init: 'absent',
  transitions: [
    { name: 'requestIntegration', from: 'absent', to: 'upRequested' },
    { name: 'abortIntegration', from: 'upRequested', to: 'upAborted' },
    { name: 'prepareIntegration', from: 'upRequested', to: 'upPending' },
    { name: 'declineIntegration', from: 'upPending', to: 'upDeclined' },
    { name: 'completeIntegration', from: 'upPending', to: 'integrated' },
    { name: 'requestRemoval', from: 'integrated', to: 'delRequested' },
    { name: 'abortRemoval', from: 'delRequested', to: 'delAborted' },
    { name: 'prepareRemoval', from: 'delRequested', to: 'delPending' },
    { name: 'declineRemoval', from: 'delPending', to: 'delDeclined' },
    { name: 'completeRemoval', from: 'delPending', to: 'deleted' },
  ],
  methods: {
    onMelt: function () {
      console.log('I melted')
    },
    onFreeze: function () {
      console.log('I froze')
    },
    onVaporize: function () {
      console.log('I vaporized')
    },
    onCondense: function () {
      console.log('I condensed')
    },
  },
}

class MetadataState {
  private defaultState: string
  private metadataState: string
  constructor() {}
}

class LocalState extends MetadataState {
  constructor() {
    super()
  }
}

class DistantState extends MetadataState {
  private destination: string
  constructor(destination: string) {
    super()
    this.destination = destination
  }
}
