import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/agents')
      .then(result => setAgents(result.agents || []))
      .catch(error => setMessage(error.message));
  }, []);

  return (
    <div className="page-card">
      <h1>Agents</h1>
      {message && <div className="form-error">{message}</div>}
      <div className="agents-list">
        {agents.map(agent => (
          <div key={agent._id} className="agent-card">
            <div>{agent.firstName} {agent.lastName}</div>
            <div>{agent.email}</div>
            <div>{agent.phone}</div>
            <div>{agent.address}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
