import React, { Component } from 'react'
import { View, Button, Text, Image, StyleSheet, TextInput } from 'react-native'
import { connect } from 'react-redux'
import Meets from './Meets'
import Events from './Events'
import Profile from './Profile'
import getApiUrl from '../environment.js'
import axios from 'axios'

class Main extends Component {
  async componentDidMount() {
    debugger
    await axios
      .post(`${getApiUrl()}/graphql`, {
        data: {
          query: `
                Users {
                    id
                    first_name
                    last_name
                    email
                    phone_number
                    password_hash
                    profile_photo
                    interests
                    exp
                    lvl
                }
            `
        }
      })
      .then(result => {
        console.log(result.data)
      })
  }

  render() {
    let mainView

    if (this.props.activeView === 'events') {
      mainView = <Events />
    } else if (this.props.activeView === 'meets') {
      mainView = <Meets />
    } else if (this.props.activeView === 'profile') {
      mainView = <Profile />
    }
    return <View style={styles.main}>{mainView}</View>
  }
}

const styles = StyleSheet.create({
  main: {
    flex: 11,
    backgroundColor: 'green'
  }
})

const mapStateToProps = state => {
  return {
    activeView: state.activeView
  }
}

const mapDispatchToProps = dispatch => {
  return {
    toggleView: currentView => {
      dispatch({
        type: 'SET_VIEW',
        currentView: currentView
      })
    },
    setAllUsers: allUsers => {
      dispatch({
        type: 'SET_ALL_USERS',
        allUsers: allUsers
      })
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main)

{
  /* <Button 
    title="Toggle Button" 
    onPress={() => {
        if (this.props.currentView === "events") {
            this.props.toggleView("meets")
        }else if (this.props.currentView === "meets") {
            this.props.toggleView("events")
        }
    }}
/> */
}
