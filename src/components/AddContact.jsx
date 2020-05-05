import React, {Component} from 'react';
import Button from 'react-bootstrap-button-loader';

export default class AddContact extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {updateContact, handleNewContactSubmit, newContact, error, inProgress} = this.props;
    return (
      <div className="new-contact">
        <div className="col-md-8">
          <br/>
          <p className="h3">Add New Contact</p>
          <br/>
          <input type="text" className="form-control"
                 value={newContact.name}
                 onChange={e => updateContact('name', e.target.value)}
                 placeholder="Name" required={true}
          />
          <br/>
          <input type="text" className="form-control"
                 value={newContact.number}
                 onChange={e => updateContact('number', e.target.value)}
                 placeholder="Phone Number" required={true}
          />
          <br/>
          <input type="email" className="form-control"
                 value={newContact.email}
                 onChange={e => updateContact('email', e.target.value)}
                 placeholder="Email" required={true}
          />
          <br/>
		  <input type="text" className="form-control"
                 value={newContact.website}
                 onChange={e => updateContact('website', e.target.value)}
                 placeholder="Website" required={true}
          />
          <br/>
		  <input type="text" className="form-control"
                 value={newContact.categories}
                 onChange={e => updateContact('categories', e.target.value)}
                 placeholder="Category" required={true}
          />
          <br/>
        </div>
        <div className="col-md-12">
          <Button
            variant="primary"
            onClick={e => handleNewContactSubmit(e, this.props.history)}
            loading={inProgress}
          >
            Add
          </Button>
          <br/>
          <br/>
          {error && <div>Error: {error}</div>}
        </div>

      </div>
    )
  }
}
