import axios from 'axios'
import React, { useEffect, useState } from 'react'

/**
 * Composant : Monitoring
 * @return {ReactNode}
 */
function Monitoring({}) {
  return
  const [generalMonitoring, setGeneralMonitoring] = useState({})

  useEffect(() => {
    Promise.all([
      axios
        .get(`api/data/resources`, { params: { count_by: 'metadata_info.api_version' } })
        .catch(() => {
          return { data: [] }
        }),
      axios.get(`api/data/resources`, { params: { count_by: 'storage_status' } }).catch(() => {
        return { data: [] }
      }),
      axios
        .get(`api/data/resources`, {
          params: { count_by: 'metadata_info.api_version', updated_after: '2021-10-01' },
        })
        .catch(() => {
          return { data: [] }
        }),
      axios
        .get(`api/data/resources`, {
          params: { count_by: 'producer' },
        })
        .catch(() => {
          return { data: [] }
        }),
      axios
        .get(`api/data/reports`, {
          params: { count_by: 'integration_status' },
        })
        .catch(() => {
          return { data: [] }
        }),
    ]).then((values) => {
      console.log(values)
      setGeneralMonitoring({
        total: values[0].data,
        byStorageStatus: values[1].data,
        recentlyMod: values[2].data,
        byProducer: values[3].data,
        reportsByStatus: values[4].data,
      })
    })
  }, [])

  return (
    <div className="tempPaddingTop">
      <div className="row catalogue">
        <div className="col-4">
          <div className="card">
            <h5 className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <span>Total Métadonnéees :</span>
              </div>
            </h5>
            <div className="card-body">
              <div className="card-text justify-content-between align-items-center">
                <div className="badge-monitoring">
                  {generalMonitoring.total &&
                    generalMonitoring.total.reduce((accum, item) => accum + item.count, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card">
            <h5 className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <span>Modification récentes :</span>
              </div>
            </h5>
            <div className="card-body">
              <div className="card-text justify-content-between align-items-center">
                <div className="badge-monitoring">
                  {generalMonitoring.recentlyMod &&
                    generalMonitoring.recentlyMod.reduce((accum, item) => accum + item.count, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        {generalMonitoring.byStorageStatus &&
          generalMonitoring.byStorageStatus.map((status) => {
            return (
              <div key={status.storage_status} className="col-4">
                <div className="card">
                  <h5 className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Métadonnéees &quot;{status.storage_status}&quot; :</span>
                    </div>
                  </h5>
                  <div className="card-body">
                    <div className="card-text justify-content-between align-items-center">
                      <div className="badge-monitoring">{status.count}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
      <div className="row">
        {generalMonitoring.byProducer &&
          generalMonitoring.byProducer.map((prod) => {
            return (
              <div key={prod.producer.organization_id} className="col-4">
                <div className="card">
                  <h5 className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Métadonnéees par {prod.producer?.organization_name} :</span>
                    </div>
                  </h5>
                  <div className="card-body">
                    <div className="card-text justify-content-between align-items-center">
                      <div className="badge-monitoring">{prod.count}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
      <div className="row">
        {generalMonitoring.reportsByStatus &&
          generalMonitoring.reportsByStatus.map((status) => {
            return (
              <div key={status.integration_status} className="col-4">
                <div className="card">
                  <h5 className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Rapport &quot;{status.integration_status}&quot; :</span>
                    </div>
                  </h5>
                  <div className="card-body">
                    <div className="card-text justify-content-between align-items-center">
                      <div className="badge-monitoring">{status.count}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
Monitoring.propTypes = {}

export default Monitoring
