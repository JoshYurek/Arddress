import React, {Component} from 'react';
import {Card} from 'react-bootstrap';
import {FaTrash} from 'react-icons/fa';
import StackGrid from 'react-stack-grid';
import sizeMe from 'react-sizeme';

class ListContacts extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchFilter: ''
    }
  }

  truncate(s, max) {
    if (s.length > max) {
      s = s.slice(0, max) + "...";
    }
    return s;
  }

  setSearchFilter(e){
    this.setState({searchFilter: e.target.value})
  }

  render() {
    const {contacts, isLoading, category, deleteContact, size} = this.props;
    const { width} = size;
    return (
      <div className="col-md-12 contacts">
        <br/>
        <p className="h3" style={{textTransform: 'capitalize'}}>{category} Contacts</p>
        {isLoading && <span>Fetching Contacts...</span>}
        {contacts.length > 0 &&
          <div style={{float: "right"}}>
            <input type="text" className="form-control-sm" placeholder="Search" onChange={this.setSearchFilter.bind(this)}/>
          </div>
        }
        <br/>
        <br/>
        <StackGrid columnWidth={width <= 768 ? '100%' : '33.33%'} gutterWidth={10} gutterHeight={10} duration={0}>
          {contacts
            .filter(contact => contact.categories.includes(category) || category === "all")
            .filter(contact => contact.name.toLowerCase().search(this.state.searchFilter.toLowerCase().trim()) !== -1
              ||  contact.number.toLowerCase().search(this.state.searchFilter.toLowerCase().trim()) !== -1
              || this.state.searchFilter.trim() === "" )
            .map((contact) => (

            <Card border="dark" key={contact.id + width} bg="dark" text="white">
              <Card.Header>Contact</Card.Header>
			  <Card.Body>
                <Card.Title style={{textTransform: 'capitalize'}}>{this.truncate(contact.name, 1000)}</Card.Title>
                <Card.Text>
				 Number: {this.truncate(contact.number, 1000)}
                </Card.Text>
				<Card.Text>
                 Email: {this.truncate(contact.email, 1000)}
                </Card.Text>
				<Card.Text>
                  Web: {this.truncate(contact.website, 1000)}
                </Card.Text>
                {contact.categories.length > 0 &&
                <Card.Text>
                  Category: {this.truncate(contact.categories, 100)}
                </Card.Text>
                }
                <div style={{float: 'right'}}>
                  <FaTrash onClick={e => window.confirm("Are you sure you want to delete this contact?") && deleteContact(e, contact.id)} style={{cursor: 'pointer'}}/>
                </div>
              </Card.Body>
            </Card>
            )
          )}
        </StackGrid>
        {!isLoading && !contacts.length && <span>Add a contact to get started</span>}
        <br/>
      </div>
    )
  }
}

export default sizeMe({monitorHeight: true})(ListContacts);
