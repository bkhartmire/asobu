import React, { Component } from 'react'
import { View, StyleSheet, Alert, AppState } from 'react-native'
import { connect } from 'react-redux'
import { getChat, getUserChats } from '../src/actions/chats'
import {
  getUsers,
  getUserLimited,
  getUserEquippedBadges
} from '../src/actions/users'
import { startHangout } from '../src/actions/hangouts'
import Profile from './Profile'
import Results from './Results'
import Inbox from './Inbox'
import registerPush from '../registerPush'

interface Props {
  activeView: string
  email: string
  toggleView: Function
  setAllUsers: Function
  removeUser: Function
  removeUserChat: Function
  acceptHangoutRequest: Function
  receiveHangoutRequest: Function
  startHangout: Function
  context: Function
  dispatchStartHangout: Function
  dispatchFinishHangout: Function
  getUsers: Function
  getChat: Function
  socket: WebSocket
  hiddenUsers: string[]
  hangouts: [Hangout]
  currentUserLimited: UserLimitedBadges
  acceptedHangouts: Array<UserLimitedBadges>
  latitude: number
  longitude: number
}

interface Hangout {
  id: string
  participants: [UserLimited]
}

interface UserLimited {
  first_name: string
  email: string
  profile_photo: string
}

interface UserLimitedBadges {
  first_name: string
  email: string
  profile_photo: string
  equipped_badges: string[]
}
const questions = [
  "What's your most unique accomplishment?",
  'If you could instantly become an expert in something, what would it be?',
  "What is the scariest thing you've ever done for fun?",
  'Would you rather be able to talk with animals or speak all foreign languages?',
  'Would you rather mentally of physically never age?',
  'If aliens landed on earth tomorrow and offered to take you home with them, would you go?',
  'Say you’re independently wealthy and don’t have to work, what would you do with your time?',
  'Teleportation or flying?',
  'If you had a time machine, would go back in time or into the future?',
  'Would you rather lose the ability to read or lose the ability to speak?',
  'Would you rather be covered in fur or covered in scales?',
  'Would you rather have unlimited international first-class tickets for life or never have to pay for food at restaurants for ten years?'
]
class Main extends Component<Props> {
  async componentWillMount() {
    const pushRes = await registerPush(this.props.email)

    this.props.socket.send(`l0 ${this.props.email} ${pushRes}`)
    this.props.socket.onmessage = async event => {
      console.log(`FROM SERVER: ${event.data}`)
      if (AppState.currentState === 'background') {
        console.log('WS ')
        let title
        let content
        switch (event.data.split(' ')[0]) {
          case 'm0':
            title = 'New,Message'
            content = 'You,have,a,new,chat,message.'
            break
          case 'h0':
            title = 'New,Hangout,Request'
            content = 'You,have,received,a,new,hangout,request!'
            break
          case 'h1':
            title = 'Approved,Hangout,Request'
            content = 'Your,hangout,request,was,accepted!'
            break
          case 's0':
            title = 'Start,Hangout,Request'
            content = 'Your,partner,is,ready,to,start,your,hangout!'
            break
          default:
            return
        }
        //send push notification if app isn't open
        //[0] push, [1] Stringified array: [0]target email, [2] title , [3] message
        this.props.socket.send(`push ${this.props.email} ${title} ${content}`)
      } else {
        const message = event.data.split(' ')
        //Heartbeat
        if (message[0] === 'p0') {
          this.props.socket.send(`p0 ${this.props.email}`)
          // comment out socket.send to use dummy data
          console.log('PONGED')
        }
        //Message Update
        if (message[0] === 'm0') {
          console.log('CLIENT RECEIVED MESSAGE')
          this.props.getChat(message[1], undefined)
        }
        //Block User
        if (message[0] === 'b0') {
          console.log('CLIENT BLOCKED')
          this.props.removeUser(message[1])
          this.props.removeUserChat(~~message[2])
        }
        //Send Hangout Request
        if (message[0] === 'h0') {
          console.log('CLIENT RECEIVED HANGOUT REQUEST')
          const newUserLimited = await getUserLimited(message[1])
          this.props.receiveHangoutRequest(newUserLimited)
        }
        //Accept Hangout Request
        if (message[0] === 'h1') {
          console.log('CLIENT HANGOUT REQUEST APPROVED')
          const newChatMessages = await getUserChats(this.props.email)
          const newChat = newChatMessages.pop()
          const equipped_badges = await getUserEquippedBadges(
            newChat.participants[0].email
          )
          this.props.acceptHangoutRequest(newChat, equipped_badges)
          Alert.alert(
            `${message[2]} has accepted your hangout request!`,
            'Visit chats to start talking!'
          )
        }
        //Start Hangout Request
        if (message[0] === 's0') {
          console.log('CLIENT RECEIVED START HANGOUT REQUEST')
          Alert.alert(
            'Please Confirm',
            `Have you and ${message[2]} started your hangout?`,
            [
              {
                text: 'No',
                onPress: () => console.log('DENIED START HANGOUT REQUEST')
              },
              {
                text: 'Yes',
                onPress: async () => {
                  console.log('CONFIRMED START HANGOUT')
                  const hangout = this.props.acceptedHangouts.filter(
                    hangout => hangout.email === message[1]
                  )
                  const participants = [
                    this.props.currentUserLimited,
                    hangout.pop()
                  ]
                  const hangoutId = await startHangout(participants)
                  this.props.dispatchStartHangout(participants[1], hangoutId)
                  this.props.socket.send(
                    `s1 ${this.props.email} ${message[1]} ${hangoutId}`
                  )
                }
              }
            ],
            { cancelable: false }
          )
        }
        //Confirm Start Hangout
        if (message[0] === 's1') {
          console.log('START HANGOUT CONFIRMED')
          const user = await getUserLimited(message[1])
          this.props.dispatchStartHangout(user, message[2])
        }
        //Hangout has been finished by other user
        if (message[0] === 'f1') {
          console.log('FINISH HANGOUT')
          const user = await getUserLimited(message[1])
          this.props.dispatchFinishHangout(user, message[2])
        }
        //Hangout partner has requested to play game
        if (message[0] === 'q0') {
          console.log('GAME REQUESTED')
          Alert.alert(
            "Let's play a game!",
            'Would you like to play an icebreaker?',
            [
              {
                text: 'Maybe later.',
                onPress: () => console.log('User denied game request.')
              },
              {
                text: 'Lets play!',
                onPress: () =>
                  this.props.socket.send(`q1 ${this.props.email} ${message[1]}`)
              }
            ]
          )
        }
        //Receive quiz question
        if (message[0] === 'q1') {
          console.log('RECEIVED GAME QUESTION')
          Alert.alert('Icebreaker Question', questions[~~message[1]])
        }
      }
    }
    this.props.getUsers(
      this.props.email,
      this.props.hiddenUsers,
      this.props.hangouts,
      this.props.latitude,
      this.props.longitude
    )
  }

  render() {
    let mainView

    if (this.props.activeView === 'profile') {
      mainView = <Profile />
    } else if (this.props.activeView === 'results') {
      mainView = <Results />
    } else if (this.props.activeView === 'chats') {
      mainView = <Inbox />
    }

    return (
      <>
        <View style={styles.main}>{mainView}</View>
      </>
    )
  }
}

const styles = StyleSheet.create({
  main: {
    flex: 11,
    backgroundColor: '#e5e6e5'
  }
})

const mapStateToProps = state => {
  return {
    activeView: state.activeView,
    allUsers: state.allUsers,
    email: state.user.email,
    hiddenUsers: [
      ...state.blockedUsers,
      ...state.blockedByUsers,
      ...state.user.received_hangout_requests.map(request => request.email),
      ...state.user.accepted_hangouts.map(hangout => {
        if (hangout.email) return hangout.email
      })
    ],
    hangouts: state.ongoingHangouts,
    currentUserLimited: {
      first_name: state.user.first_name,
      email: state.user.email,
      profile_photo: state.user.profile_photo,
      equipped_badges: state.user.equipped_badges
    },
    acceptedHangouts: state.acceptedHangouts,
    longitude: state.longitude,
    latitude: state.latitude
  }
}

const mapDispatchToProps = dispatch => {
  return {
    setActiveView: activeView => {
      dispatch({
        type: 'SET_ACTIVE_VIEW',
        activeView: activeView
      })
    },
    updateChat: chat => {
      dispatch({
        type: 'SHOW_CHAT',
        messages: chat
      })
    },
    getChat: (chatId, partner) => dispatch(getChat(chatId, partner)),
    getUsers: (currentUserEmail, blockedUsers, hangouts, latitude, longitude) =>
      dispatch(
        getUsers(currentUserEmail, blockedUsers, hangouts, latitude, longitude)
      ),
    removeUser: userEmail => {
      dispatch({ type: 'REMOVE_USER', userEmail })
    },
    removeUserChat: chatId => {
      dispatch({ type: 'REMOVE_USER_CHAT', chatId })
    },
    acceptHangoutRequest: (newChat, equippedBadges) => {
      dispatch({ type: 'ACCEPT_REQUEST', newChat, equippedBadges })
    },
    receiveHangoutRequest: userLimited => {
      dispatch({ type: 'RECEIVE_REQUEST', userLimited })
    },
    dispatchStartHangout: (participant, hangoutId) => {
      dispatch({ type: 'START_HANGOUT', participant, hangoutId })
    },
    dispatchFinishHangout: (userToReview, hangoutId) => {
      dispatch({ type: 'FINISH_HANGOUT', userToReview, hangoutId })
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main)
