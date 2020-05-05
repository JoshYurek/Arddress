import React, {Component} from 'react';

import {Route, HashRouter} from 'react-router-dom';
import SideNav, {NavItem, NavIcon, NavText} from '@trendmicro/react-sidenav';
import '@trendmicro/react-sidenav/dist/react-sidenav.css';
import {FaAddressCard, FaPlusCircle} from 'react-icons/fa';
import {Navbar} from 'react-bootstrap';

import AddContact from './AddContact.jsx';
import ListContacts from './ListContacts.jsx';
import Arweave from 'arweave/web';

const arweave = Arweave.init();
let appName = 'arddress-book';
let appVersion = '0.0.1';

export default class Main extends Component {

  constructor(props) {
    super(props);
    this.state = {
      newContact: {
        name: '',
        number: '',
        email: '',
		website: '',
        categories: []
      },
      contacts: [],
      categories: [],
      isLoading: false,
      expanded: false,
      error: '',
      inProgress: false
    };
  }

  async encrypt_data(data, pub_key) {
    let content_encoder = new TextEncoder();
    let newFormat = JSON.stringify(data);
    let content_buf = content_encoder.encode(newFormat);
    let key_buf = await this.generate_random_bytes(256);

    // Encrypt data segments
    let encrypted_data = await arweave.crypto.encrypt(content_buf, key_buf);
    let encrypted_key = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      pub_key,
      key_buf
    );

    // Concatenate and return them
    return arweave.utils.concatBuffers([encrypted_key, encrypted_data])
  }

  async decrypt_data(enc_data, key) {
    let enc_key = new Uint8Array(enc_data.slice(0, 512));
    let enc_contents = new Uint8Array(enc_data.slice(512));
    let symmetric_key = await window.crypto.subtle.decrypt({name: 'RSA-OAEP'}, key, enc_key);
    return arweave.crypto.decrypt(enc_contents, symmetric_key);
  }

  async wallet_to_key(wallet) {
    let w = Object.create(wallet);
    w.alg = 'RSA-OAEP-256';
    w.ext = true;
    let algo = {name: 'RSA-OAEP', hash: {name: 'SHA-256'}};
    return await crypto.subtle.importKey('jwk', w, algo, false, ['decrypt'])
  }

  async get_public_key(key) {
    let keyData = {
      kty: 'RSA',
      e: 'AQAB',
      n: key.n,
      alg: 'RSA-OAEP-256',
      ext: true
    };
    let algo = {name: 'RSA-OAEP', hash: {name: 'SHA-256'}};
    return await crypto.subtle.importKey('jwk', keyData, algo, false, ['encrypt'])
  }

  async generate_random_bytes(length) {
    let array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return array
  }

  updateContact(key, value) {
    const contact = this.state.newContact;
    if (key === "categories") {
      value = [value];
    }
    contact[key] = value;
    this.setState({
      newContact: contact
    })
  }

  async deleteContact(event, id) {
    const {keys} = this.props;
    const updatedContacts = this.state.contacts.filter(contact => {
      return contact.id !== id;
    });
    let categories = updatedContacts.map(b => b.categories[0]);
    categories = Array.from(new Set(categories));
    this.setState({
      contacts: updatedContacts,
      categories: categories
    });
    let pub_key = await this.get_public_key(keys);
    let content = await this.encrypt_data({id: id, isDeleted: true}, pub_key);
    let tx = await arweave.createTransaction(
      {
        data: arweave.utils.concatBuffers([content])
      },
      keys
    );
    let tagUnixTime = Math.round((new Date()).getTime() / 1000);
    tx.addTag('App-Name', appName);
    tx.addTag('App-Version', appVersion);
    tx.addTag('Unix-Time', tagUnixTime);
    let anchor_id = await arweave.api.get('/tx_anchor').then(x => x.data);
    tx.last_tx = anchor_id;
    await arweave.transactions.sign(tx, keys);
    arweave.transactions.post(tx)
      .then(() => {
        localStorage.setItem('contacts', JSON.stringify(updatedContacts));
        localStorage.setItem('categories', JSON.stringify(categories));
      });

  }

  async handleNewContactSubmit(event, history) {
    let newContact = this.state.newContact;
    if (typeof newContact.name === "undefined" || newContact.name.trim() === "") {
      this.setState({error: "Name is Required "});
      return;
    }
    if (typeof newContact.number === "undefined" || newContact.number.trim() === "") {
      this.setState({error: "Phone Number is Required "});
      return;
    }
    if (typeof newContact.email === "undefined" || newContact.email.trim() === "") {
      newContact.email = '';
    } 
	if (typeof newContact.website === "undefined" || newContact.website.trim() === "") {
      newContact.website = '';
    }
    if (typeof newContact.categories[0] === "undefined" || newContact.categories[0].trim() === "") {
      newContact.categories = [];
    }
    if (newContact.categories.length > 0 && newContact.categories[0].trim().length > 100) {
      this.setState({error: "Category length should not exceed more than 100 characters"});
      return;
    }
    this.setState({error: '', inProgress: true});
    await this.saveNewContact(newContact);
    this.setState({
      newContact: {
        name: '',
        number: '',
        email: '',
		website: '',
        categories: []
      },
      inProgress: false
    });
    history.push('/contacts');
  }

  async saveNewContact(newContact) {
    const {keys} = this.props;
    let contacts = this.state.contacts;
    let categories = this.state.categories;

    newContact.id = Math.round(new Date().getTime() / 1000);
    newContact.created_at = Date.now();

    contacts.unshift(newContact);
    if (!categories.includes(newContact.categories[0])) {
      categories.push(newContact.categories[0]);
    }
    let pub_key = await this.get_public_key(keys);
    let content = await this.encrypt_data(newContact, pub_key);
    let tx = await arweave.createTransaction(
      {
        data: arweave.utils.concatBuffers([content])
      },
      keys
    );
    let tagUnixTime = Math.round((new Date()).getTime() / 1000);
    tx.addTag('App-Name', appName);
    tx.addTag('App-Version', appVersion);
    tx.addTag('Unix-Time', tagUnixTime);
    let anchor_id = await arweave.api.get('/tx_anchor').then(x => x.data);
    tx.last_tx = anchor_id;
    await arweave.transactions.sign(tx, keys);
    arweave.transactions.post(tx)
      .then(() => {
        localStorage.setItem('contacts', JSON.stringify(contacts));
        localStorage.setItem('categories', JSON.stringify(categories));
        this.setState({
          contacts: contacts,
          categories: categories
        })
      });
  }

  async fetchData() {
    this.setState({isLoading: true});
    let savedContacts = localStorage.getItem('contacts') || '';
    let savedCategories = localStorage.getItem('categories') || '';
    if (savedContacts !== '' && savedCategories !== '') {
      savedContacts = JSON.parse(savedContacts);
      savedCategories = JSON.parse(savedCategories);
      this.setState({
        contacts: savedContacts,
        categories: savedCategories,
        isLoading: false
      });
      return
    }
    const txids = await arweave.arql({
      op: "and",
      expr1: {
        op: "equals",
        expr1: "from",
        expr2: this.props.address
      },
      expr2: {
        op: "equals",
        expr1: "App-Name",
        expr2: appName
      }
    });
    let key = await this.wallet_to_key(this.props.keys);
    let decrypt_data = this.decrypt_data;
    let contacts = await Promise.all(txids.map(async function (id, i) {
      let tx = await arweave.transactions.get(id);
      return JSON.parse(arweave.utils.bufferToString(
        await decrypt_data(arweave.utils.b64UrlToBuffer(tx.data), key)))
    }));

    const deletedContacts = contacts.filter(contact => {
      return contact.isDeleted === true
    });
    const deletedContactIds = deletedContacts.map(b => b.id);
    contacts = contacts.filter(contact => {
      return deletedContactIds.indexOf(contact.id) === -1
    });
    let categories = contacts.map(b => b.categories[0]);
    categories = Array.from(new Set(categories));
    localStorage.setItem('contacts', JSON.stringify(contacts));
    localStorage.setItem('categories', JSON.stringify(categories));
    this.setState({
      contacts: contacts,
      categories: categories,
      isLoading: false
    })
  }

  onToggle(expanded) {
    this.setState({expanded: expanded});
  }

  truncate(s, max) {
    if (s.length > max) {
      s = s.slice(0, max) + "...";
    }
    return s;
  }

  render() {
    const {handleSignOut, address} = this.props;
    const {expanded, contacts, categories, isLoading, error, inProgress} = this.state;
    return (
      address !== '' ?
        <HashRouter>
          <Route render={({location, history}) => (
            <React.Fragment>
              <div className="site-sub-wrapper">
                <SideNav className="side-nav"
                         onSelect={(selected) => {
                           const to = '/' + selected;
                           if (location.pathname !== to) {
                             history.push(to);
                           }
                         }}
                         onToggle={this.onToggle.bind(this)}
                >
                  <SideNav.Toggle/>
                  <SideNav.Nav selected={location.pathname.replace('/', '')} className="side-nav-sub">
                    <NavItem eventKey="contacts">
                      <NavIcon>
                        <FaAddressCard/>
                      </NavIcon>
                      <NavText>
                        Contacts
                      </NavText>
                    </NavItem>
                    <NavItem eventKey="add_contact">
                      <NavIcon>
                        <FaPlusCircle/>
                      </NavIcon>
                      <NavText>
                        Add New Contact
                      </NavText>
                    </NavItem>					
                    {categories.filter(category => typeof category !== "undefined" && category.trim() !== "").map((category) => (
                        <NavItem eventKey={category} key={'nav_' + category}>
                          <NavIcon>

                          </NavIcon>
                          <NavText>
                            {this.truncate(category, 20)}
                          </NavText>
                        </NavItem>

                      )
                    )}
                  </SideNav.Nav>
                </SideNav>
                <Navbar bg="nav" variant="dark" style={{
                  marginLeft: expanded ? 240 : 64
                }}>
                  <Navbar.Brand style={{marginLeft: '20px'}}>Arddress Book</Navbar.Brand>
                  <div className="collapse navbar-collapse justify-content-end" id="navbarCollapse">
                    <ul className="navbar-nav">
                      <li className="nav-item">
                        <div>
                          <button className="btn btn-light btn-sm"
                                  onClick={e => handleSignOut(e)}>Close
                          </button>
                        </div>
                      </li>
                    </ul>
                  </div>
                </Navbar>
                <main style={{
                  marginLeft: expanded ? 240 : 64,
                  padding: '10px 20px 0 20px'
                }}>
                  <Route path="/contacts" exact render={props => <ListContacts
                    contacts={contacts} isLoading={isLoading} category="all"
                    deleteContact={this.deleteContact.bind(this)}/>}/>
                  <Route path="/" exact render={props => <ListContacts
                    contacts={contacts} isLoading={isLoading} category="all"
                    deleteContact={this.deleteContact.bind(this)}/>}/>
                  <Route path="/add_contact" render={props => <AddContact
                    updateContact={this.updateContact.bind(this)}
                    inProgress={inProgress}
                    handleNewContactSubmit={this.handleNewContactSubmit.bind(this)}
                    newContact={this.state.newContact} history={history} error={error}/>}/>

                  {categories.filter(category => typeof category !== "undefined" && category.trim() !== "").map((category) => (
                      <Route path={"/" + category} render={props => <ListContacts
                        contacts={contacts} isLoading={isLoading} category={category}
                        deleteContact={this.deleteContact.bind(this)}/>} key={'route' + category}/>

                    )
                  )}
                </main>
              </div>
            </React.Fragment>
          )}
          />
        </HashRouter>

        : null
    );
  }

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(prevProps, prevState) {
    //console.log(prevState, this.state);
  }

}
