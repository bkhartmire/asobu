import React from 'react'
import { StyleSheet, ScrollView, Text, View } from 'react-native'
import { connect } from 'react-redux'
import User from '../components/User'
import { SocketContext } from './SocketProvider'

const UserList = props => {
  const sentHangoutRequestEmails = props.sentHangoutRequests.map(
    userLimited => userLimited.email
  )
  const userList = props.allUsers.map(user => {
    if (sentHangoutRequestEmails.includes(user.email)) {
      return (
        <View style={styles.text__box} key={user.email}>
          <Text style={styles.text}>
            Your hangout request with {user.first_name} is pending...
          </Text>
        </View>
      )
    } else if (props.isActive) {
      return (
        <SocketContext.Consumer key={user.email}>
          {socket => <User user={user} socket={socket} />}
        </SocketContext.Consumer>
      )
    }
  })
  return <ScrollView style={styles.users}>{userList}</ScrollView>
}

const styles = StyleSheet.create({
  users: {
    marginBottom: 10,
    height: '100%',
    width: '100%'
  },
  text__box: {
    backgroundColor: '#bcd634',
    marginBottom: 5,
    marginTop: 5,
    padding: 10,
    alignItems: 'center'
  },
  text: {
    color: 'white',
    fontWeight: '800'
  }
})

const mapStateToProps = state => {
  return {
    allUsers: state.allUsers,
    sentHangoutRequests: state.sentHangoutRequests,
    isActive: state.isActive
  }
}

export default connect(mapStateToProps)(UserList)
