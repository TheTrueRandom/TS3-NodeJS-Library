const mockExecute = jest.fn()
const mockTransfer = jest.fn()
const mockClose = jest.fn()

jest.mock("../src/transport/TeamSpeakQuery", () => {
  const { TeamSpeakQuery } = jest.requireActual("../src/transport/TeamSpeakQuery")

  TeamSpeakQuery.getSocket = function() {
    return { on() {}, send() {}, sendKeepAlive() {}, close() { mockClose() } }
  }

  TeamSpeakQuery.prototype.execute = mockExecute

  return { TeamSpeakQuery }
})

jest.mock("../src/transport/FileTransfer", () => {

  class FileTransfer {
    constructor() {}
    download() {
      return mockTransfer(...arguments)
    }
    upload() {
      return mockTransfer(...arguments)
    }
  }

  return { FileTransfer }
})

import { TeamSpeak, QueryProtocol, TextMessageTargetMode, LogLevel, ReasonIdentifier } from "../src/TeamSpeak"
import { TeamSpeakServerGroup } from "../src/node/ServerGroup"
import { TeamSpeakServer } from "../src/node/Server"
import { TeamSpeakChannel } from "../src/node/Channel"
import { TeamSpeakChannelGroup } from "../src/node/ChannelGroup"
import { TeamSpeakClient } from "../src/node/Client"

import * as mocks from "./mocks/queryresponse"

describe("TeamSpeak", () => {
  let teamspeak: TeamSpeak = new TeamSpeak({})

  beforeEach(() => {
    teamspeak = new TeamSpeak({})
    mockTransfer.mockReset()
    mockClose.mockReset()
    mockExecute.mockReset()
    mockExecute.mockResolvedValue(null)
  })

  describe("#new()", () => {
    it("should test the construction of TeamSpeak with an empty object", () => {
      let teamspeak = new TeamSpeak({})
      expect(teamspeak.config)
        .toEqual({
          protocol: QueryProtocol.RAW,
          host: "127.0.0.1",
          queryport: 10011,
          readyTimeout: 10000,
          keepAlive: true
        })
    })
    it("should test the construction of TeamSpeak with an username and password", () => {
      let teamspeak = new TeamSpeak({ username: "foo", password: "bar" })
      expect(teamspeak.config)
        .toEqual({
          protocol: QueryProtocol.RAW,
          host: "127.0.0.1",
          queryport: 10011,
          readyTimeout: 10000,
          keepAlive: true,
          username: "foo",
          password: "bar"
        })
    })
    it("should test the construction of TeamSpeak with protocol SSH", () => {
      let teamspeak = new TeamSpeak({ protocol: QueryProtocol.SSH })
      expect(teamspeak.config)
        .toEqual({
          protocol: QueryProtocol.SSH,
          host: "127.0.0.1",
          queryport: 10022,
          readyTimeout: 10000,
          keepAlive: true
        })
    })
    it("should test the construction of TeamSpeak with a serverport", () => {
      let teamspeak = new TeamSpeak({ serverport: 5000 })
      expect(teamspeak.config)
        .toEqual({
          protocol: QueryProtocol.RAW,
          host: "127.0.0.1",
          queryport: 10011,
          readyTimeout: 10000,
          keepAlive: true,
          serverport: 5000
        })
    })
  })


  describe("#handleConnect()", () => {
    it("check an empty connection config", async () => {
      const teamspeak = new TeamSpeak({})
      teamspeak["query"].emit("connect")
      expect(mockExecute).toHaveBeenCalledTimes(0)
    })
    it("check a connection config with username and password", async () => {
      const teamspeak = new TeamSpeak({ username: "foo", password: "bar" })
      teamspeak["query"].emit("ready")
      expect(mockExecute).toBeCalledWith("login", ["foo", "bar"])
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
    it("check a connection config with a serverport", async () => {
      const teamspeak = new TeamSpeak({ serverport: 9987 })
      teamspeak["query"].emit("ready")
      expect(mockExecute).toBeCalledWith("use", { port: 9987 }, ["-virtual"])
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
    it("check a connection config with a serverport and nickname", async () => {
      const teamspeak = new TeamSpeak({ serverport: 9987, nickname: "FooBar" })
      teamspeak["query"].emit("ready")
      expect(mockExecute).toBeCalledWith("use", { port: 9987, client_nickname: "FooBar" }, ["-virtual"])
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })


  it("should verify parameters of #version()", async () => {
    await teamspeak.version()
    expect(mockExecute).toHaveBeenCalledWith("version")
    expect(mockExecute).toHaveBeenCalledTimes(1)
  })

  it("should verify parameters of #clientUpdate()", async () => {
    await teamspeak.clientUpdate({ client_nickname: "Test" })
    expect(mockExecute).toHaveBeenCalledWith("clientupdate", { client_nickname: "Test"})
    expect(mockExecute).toHaveBeenCalledTimes(1)
  })

  describe("#registerEvent()", () => {
    it("should verify 2 parameters", async () => {
      await teamspeak.registerEvent("channel", 0)
      expect(mockExecute).toHaveBeenCalledWith("servernotifyregister", { event: "channel", id: 0 })
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
    it("should verify 1 parameter", async () => {
      await teamspeak.registerEvent("channel")
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("servernotifyregister", { event: "channel", id: undefined })
    })
  })

  it("should verify parameters of #queryloginadd()", async () => {
    await teamspeak.queryLoginAdd("name", 3)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("queryloginadd", {client_login_name: "name", cldbid: 3})
  })

  it("should verify parameters of #querylogindel()", async () => {
    await teamspeak.queryLoginDel(3)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("querylogindel", { cldbid: 3 })
  })

  it("should verify parameters of #queryloginlist()", async () => {
    await teamspeak.queryLoginList("search", 0, 10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("queryloginlist", { pattern: "search", start: 0, duration: 10 }, ["-count"])
  })

  it("should verify parameters of #unregisterEvent()", async () => {
    await teamspeak.unregisterEvent()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servernotifyunregister")
  })

  it("should verify parameters of #login()", async () => {
    await teamspeak.login("serveradmin", "password")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("login", ["serveradmin", "password"])
  })

  it("should verify parameters of #logout()", async () => {
    await teamspeak.logout()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("logout")
  })

  it("should verify parameters of #hostInfo()", async () => {
    await teamspeak.hostInfo()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("hostinfo")
  })

  it("should verify parameters of #instanceInfo()", async () => {
    await teamspeak.instanceInfo()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("instanceinfo")
  })

  it("should verify parameters of #instanceEdit()", async () => {
    await teamspeak.instanceEdit({ "serverinstance_filetransfer_port": 30033 })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("instanceedit", { "serverinstance_filetransfer_port": 30033 })
  })

  it("should verify parameters of #bindingList()", async () => {
    await teamspeak.bindingList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("bindinglist")
  })

  describe("#useByPort()", () => {
    it("should verify 2 parameters", async () => {
      await teamspeak.useByPort(9987, "Test")
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("use", { port: 9987, client_nickname: "Test" }, ["-virtual"])
    })
    it("should verify 1 parameter", async () => {
      await teamspeak.useByPort(9987)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("use", { port: 9987, client_nickname: undefined }, ["-virtual"])
    })
  })

  describe("#useBySid()", () => {
    it("should verify 2 parameters", async () => {
      await teamspeak.useBySid(1, "Test")
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("use", [1, "-virtual"], { client_nickname: "Test" })
    })
    it("should verify 1 parameter", async () => {
      await teamspeak.useBySid(1)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("use", [1, "-virtual"], { client_nickname: undefined })
    })
  })

  it("should verify parameters of #whoami()", async () => {
    await teamspeak.whoami()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("whoami")
  })

  it("should verify parameters of #serverInfo()", async () => {
    await teamspeak.serverInfo()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serverinfo")
  })

  it("should verify parameters of #serverIdGetByPort()", async () => {
    await teamspeak.serverIdGetByPort(9987)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serveridgetbyport", { virtualserver_port: 9987 })
  })

  it("should verify parameters of #serverEdit()", async () => {
    await teamspeak.serverEdit({ virtualserver_name: "Foo" })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serveredit", { virtualserver_name: "Foo" })
  })

  it("should verify parameters of #serverProcessStop()", async () => {
    await teamspeak.serverProcessStop("Shutdown")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serverprocessstop", { reasonmsg: "Shutdown" })
  })

  it("should verify parameters of #connectionInfo()", async () => {
    await teamspeak.connectionInfo()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serverrequestconnectioninfo")
  })

  it("should verify parameters of #serverCreate()", async () => {
    mockExecute.mockResolvedValueOnce([{ token: "servertoken", sid: 2 }])
    mockExecute.mockResolvedValueOnce([{ virtualserver_id: 2 }])
    const { server, token } = await teamspeak.serverCreate({ virtualserver_name: "Server Name" })
    expect(server).toBeInstanceOf(TeamSpeakServer)
    expect(token).toBe("servertoken")
    expect(mockExecute).toHaveBeenCalledTimes(2)
    expect(mockExecute).toHaveBeenCalledWith("servercreate", { virtualserver_name: "Server Name" })
  })

  it("should verify parameters of #serverDelete()", async () => {
    await teamspeak.serverDelete(1)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serverdelete", { sid: 1 })
  })

  it("should verify parameters of #serverStart()", async () => {
    await teamspeak.serverStart(1)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serverstart", { sid: 1 })
  })

  describe("#serverStop()", () => {
    it("should verify 2 parameters", async () => {
      await teamspeak.serverStop(1, "Shutdown")
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("serverstop", { sid: 1, reasonmsg: "Shutdown" })
    })
    it("should verify 1 parameter", async () => {
      await teamspeak.serverStop(1)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("serverstop", { sid: 1, reasonmsg: undefined })
    })
  })

  it("should verify parameters of #serverGroupCreate()", async () => {
    mockExecute.mockResolvedValue([{ sgid: 2 }])
    const group = await teamspeak.serverGroupCreate("New Group", 1)
    expect(group).toBeInstanceOf(TeamSpeakServerGroup)
    expect(mockExecute).toHaveBeenCalledTimes(2)
    expect(mockExecute).toHaveBeenCalledWith("servergroupadd", { name: "New Group", type: 1 })
  })

  it("should verify parameters of #serverGroupClientList()", async () => {
    await teamspeak.serverGroupClientList(1)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupclientlist", { sgid: 1 }, ["-names"])
  })

  it("should verify parameters of #serverGroupAddClient()", async () => {
    await teamspeak.serverGroupAddClient([1, 3], 2)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupaddclient", { sgid: 2, cldbid: [1, 3] })
  })

  it("should verify parameters of #serverGroupDelClient()", async () => {
    await teamspeak.serverGroupDelClient([1, 3], 2)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupdelclient", { sgid: 2, cldbid: [1, 3] })
  })

  it("should verify parameters of #clientAddServerGroup()", async () => {
    await teamspeak.clientAddServerGroup(1, [2, 5])
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientaddservergroup", { sgid: [2, 5], cldbid: 1 })
  })

  it("should verify parameters of #clientDelServerGroup()", async () => {
    await teamspeak.clientDelServerGroup(1, [2, 5])
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdelservergroup", { sgid: [2, 5], cldbid: 1 })
  })

  it("should verify parameters of #serverGroupDel()", async () => {
    await teamspeak.serverGroupDel(1)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupdel", { sgid: 1, force: 0 })
  })

  it("should verify parameters of #serverGroupCopy()", async () => {
    await teamspeak.serverGroupCopy(1)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupcopy", {
      name: "foo",
      ssgid: 1,
      tsgid: 0,
      type: 1
    })
  })

  it("should verify parameters of #serverGroupRename()", async () => {
    await teamspeak.serverGroupRename(1, "New Name")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergrouprename", { sgid: 1, name: "New Name" })
  })

  describe("#serverGroupPermList()", () => {
    it("should verify 2 parameters", async () => {
      await teamspeak.serverGroupPermList(2, true)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("servergrouppermlist", { sgid: 2 }, ["-permsid"])
    })
    it("should verify 1 parameter", async () => {
      await teamspeak.serverGroupPermList(2)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("servergrouppermlist", { sgid: 2 }, [null])
    })
  })

  it("should verify parameters of #serverGroupAddPerm() with permsid", async () => {
    await teamspeak.serverGroupAddPerm(2, "i_channel_subscribe_power", 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupaddperm", {
      sgid: 2,
      permsid: "i_channel_subscribe_power",
      permvalue: 25,
      permskip: 0,
      permnegated: 0
    })
  })

  it("should verify parameters of #serverGroupAddPerm() with permid", async () => {
    await teamspeak.serverGroupAddPerm(2, 11, 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupaddperm", {
      sgid: 2,
      permid: 11,
      permvalue: 25,
      permskip: 0,
      permnegated: 0
    })
  })

  it("should verify parameters of #serverGroupDelPerm() with permsid", async () => {
    await teamspeak.serverGroupDelPerm(2, "i_channel_subscribe_power")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupdelperm", { sgid: 2, permsid: "i_channel_subscribe_power" })
  })

  it("should verify parameters of #serverGroupDelPerm() with permid", async () => {
    await teamspeak.serverGroupDelPerm(2, 10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergroupdelperm", { sgid: 2, permid: 10 })
  })

  it("should verify parameters of #serverTempPasswordAdd()", async () => {
    await teamspeak.serverTempPasswordAdd({ duration: 60, pw: "pass", desc: "description", tcid: 0, tcpw: "" })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servertemppasswordadd", { duration: 60, pw: "pass", desc: "description", tcid: 0, tcpw: "" })
  })

  it("should verify parameters of #serverTempPasswordDel()", async () => {
    await teamspeak.serverTempPasswordDel("test")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servertemppassworddel", { pw: "test" })
  })

  it("should verify parameters of #serverTempPasswordList()", async () => {
    await teamspeak.serverTempPasswordList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servertemppasswordlist")
  })

  it("should verify parameters of #channelCreate()", async () => {
    mockExecute.mockResolvedValue([{ cid: 2 }])
    const channel = await teamspeak.channelCreate("Channel Name")
    expect(channel).toBeInstanceOf(TeamSpeakChannel)
    expect(mockExecute).toHaveBeenCalledTimes(2)
    expect(mockExecute).toHaveBeenCalledWith("channelcreate", { channel_name: "Channel Name" })
  })

  it("should verify parameters of #channelGroupCreate()", async () => {
    mockExecute.mockResolvedValue([{ cgid: 2 }])
    const group = await teamspeak.channelGroupCreate("Channel Group Name", 0)
    expect(group).toBeInstanceOf(TeamSpeakChannelGroup)
    expect(mockExecute).toHaveBeenCalledTimes(2)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupadd", { name: "Channel Group Name", type: 0 })
  })

  it("should verify parameters of #getChannelByID()", async () => {
    mockExecute.mockResolvedValue(mocks.channellist(5))
    const channel = await teamspeak.getChannelByID(3)
    expect(channel).toBeInstanceOf(TeamSpeakChannel)
    expect(channel!.cid).toBe(3)
    expect(channel!.name).toBe("Channel 3")
  })

  it("should verify parameters of #getChannelByName()", async () => {
    mockExecute.mockResolvedValue(mocks.channellist(5))
    const channel = await teamspeak.getChannelByName("Channel 3")
    expect(channel).toBeInstanceOf(TeamSpeakChannel)
    expect(channel!.cid).toBe(3)
    expect(channel!.name).toBe("Channel 3")
  })

  it("should verify parameters of #channelInfo()", async () => {
    await teamspeak.channelInfo(2)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelinfo", { cid: 2 })
  })

  it("should verify parameters of #channelMove()", async () => {
    await teamspeak.channelMove(10, 5)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelmove", { cid: 10, cpid: 5, order: 0 })
  })

  it("should verify parameters of #channelDelete()", async () => {
    await teamspeak.channelDelete(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channeldelete", { cid: 10, force: 0 })
  })

  it("should verify parameters of #channelEdit()", async () => {
    await teamspeak.channelEdit(1, { channel_name: "new name" })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channeledit", { cid: 1, channel_name: "new name" })
  })

  it("should verify parameters of #channelPermList() with permsid", async () => {
    await teamspeak.channelPermList(10, true)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelpermlist", { cid: 10 }, ["-permsid"])
  })

  it("should verify parameters of #channelPermList() with permid", async () => {
    await teamspeak.channelPermList(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelpermlist", { cid: 10 }, null)
  })

  it("should verify parameters of #channelSetPerm() with permsid", async () => {
    await teamspeak.channelSetPerm(10, "i_channel_subscribe_power", 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channeladdperm", {
      cid: 10,
      permsid: "i_channel_subscribe_power",
      permvalue: 25
    })
  })

  it("should verify parameters of #channelSetPerm() with permid", async () => {
    await teamspeak.channelSetPerm(10, 11, 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channeladdperm", {
      cid: 10,
      permid: 11,
      permvalue: 25
    })
  })

  it("should verify parameters of #channelSetPerms()", async () => {
    await teamspeak.channelSetPerms(5, [{ permsid: "i_channel_needed_modify_power", permvalue: 75 }])
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toBeCalledWith(
      "channeladdperm",
      { cid: 5 },
      [{ permsid: "i_channel_needed_modify_power", permvalue: 75 }]
    )
  })

  it("should verify parameters of #channelDelPerm() with permsid", async () => {
    await teamspeak.channelDelPerm(10, "i_channel_subscribe_power")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channeldelperm", { cid: 10, permsid: "i_channel_subscribe_power" })
  })

  it("should verify parameters of #channelDelPerm() with permid", async () => {
    await teamspeak.channelDelPerm(10, 11)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channeldelperm", { cid: 10, permid: 11 })
  })

  it("should verify parameters of #getClientByID()", async () => {
    mockExecute.mockResolvedValue(mocks.clientlist(5))
    const client = await teamspeak.getClientByID(3)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(client).toBeInstanceOf(TeamSpeakClient)
    expect(client!.clid).toBe(3)
  })

  it("should verify parameters of #getClientByDBID()", async () => {
    mockExecute.mockResolvedValue(mocks.clientlist(5))
    const client = await teamspeak.getClientByDBID(4)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(client).toBeInstanceOf(TeamSpeakClient)
    expect(client!.databaseId).toBe(4)
  })

  it("should verify parameters of #getClientByUID()", async () => {
    mockExecute.mockResolvedValue(mocks.clientlist(5))
    const client = await teamspeak.getClientByUID("foobar4=")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(client).toBeInstanceOf(TeamSpeakClient)
    expect(client!.uniqueIdentifier).toBe("foobar4=")
  })

  it("should verify parameters of #getClientByName()", async () => {
    mockExecute.mockResolvedValue(mocks.clientlist(5))
    const client = await teamspeak.getClientByName("Client 3")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(client).toBeInstanceOf(TeamSpeakClient)
    expect(client!.nickname).toBe("Client 3")
  })

  it("should verify parameters of #clientInfo()", async () => {
    await teamspeak.clientInfo(20)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientinfo", { clid: 20 })
  })

  it("should verify parameters of #clientDBList()", async () => {
    await teamspeak.clientDBList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdblist", { start: 0, duration: 1000 }, ["-count"])
  })

  it("should verify parameters of #clientDBList() without count", async () => {
    await teamspeak.clientDBList(0, 1000, false)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdblist", { start: 0, duration: 1000 }, null)
  })

  it("should verify parameters of #clientDBInfo()", async () => {
    await teamspeak.clientDBInfo(25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdbinfo", { cldbid: 25 })
  })

  it("should verify parameters of #clientKick()", async () => {
    await teamspeak.clientKick(10, ReasonIdentifier.KICK_CHANNEL, "Kicked from Channel")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientkick", {
      clid: 10,
      reasonid: 4,
      reasonmsg: "Kicked from Channel"
    })
  })

  it("should verify parameters of #clientMove()", async () => {
    await teamspeak.clientMove(25, 10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientmove", { clid: 25, cid: 10, cpw: undefined })
  })

  it("should verify parameters of #clientPoke()", async () => {
    await teamspeak.clientPoke(10, "you have been poked")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientpoke", { clid: 10, msg: "you have been poked" })
  })

  it("should verify parameters of #clientPermList() with permsid", async () => {
    await teamspeak.clientPermList(10, true)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientpermlist", { cldbid: 10 }, ["-permsid"])
  })

  it("should verify parameters of #clientPermList() with permid", async () => {
    await teamspeak.clientPermList(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientpermlist", { cldbid: 10 }, null)
  })

  it("should verify parameters of #clientAddPerm() with permsid", async () => {
    await teamspeak.clientAddPerm(10, "i_channel_subscribe_power", 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientaddperm", {
      cldbid: 10,
      permsid: "i_channel_subscribe_power",
      permvalue: 25,
      permskip: 0,
      permnegated: 0
    })
  })

  it("should verify parameters of #clientAddPerm() with permid", async () => {
    await teamspeak.clientAddPerm(10, 11, 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientaddperm", {
      cldbid: 10,
      permid: 11,
      permvalue: 25,
      permskip: 0,
      permnegated: 0
    })
  })

  it("should verify parameters of #clientDelPerm() with permsid", async () => {
    await teamspeak.clientDelPerm(10, "i_channel_subscribe_power")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdelperm", { cldbid: 10, permsid: "i_channel_subscribe_power" })
  })

  it("should verify parameters of #clientDelPerm() with permid", async () => {
    await teamspeak.clientDelPerm(10, 11)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdelperm", { cldbid: 10, permid: 11 })
  })

  it("should verify parameters of #customSearch()", async () => {
    await teamspeak.customSearch("key", "fdsa")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("customsearch", { ident: "key", pattern: "fdsa" })
  })

  it("should verify parameters of #customInfo()", async () => {
    await teamspeak.customInfo(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("custominfo", { cldbid: 10 })
  })

  it("should verify parameters of #customDelete()", async () => {
    await teamspeak.customDelete(10, "key")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("customdelete", { cldbid: 10, ident: "key" })
  })

  it("should verify parameters of #customSet()", async () => {
    await teamspeak.customSet(10, "key", "value")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("customset", { cldbid: 10, ident: "key", value: "value" })
  })

  it("should verify parameters of #sendTextMessage()", async () => {
    await teamspeak.sendTextMessage(10, TextMessageTargetMode.CLIENT, "message to channel chat")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("sendtextmessage", {
      target: 10,
      targetmode: 1,
      msg: "message to channel chat"
    })
  })

  it("should verify parameters of #getServerGroupByID()", async () => {
    mockExecute.mockResolvedValue(mocks.servergrouplist(5))
    const group = await teamspeak.getServerGroupByID(4)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(group).toBeInstanceOf(TeamSpeakServerGroup)
    expect(group!.sgid).toBe(4)
  })

  it("should verify parameters of #getServerGroupByName()", async () => {
    mockExecute.mockResolvedValue(mocks.servergrouplist(5))
    const group = await teamspeak.getServerGroupByName("Group 4")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(group).toBeInstanceOf(TeamSpeakServerGroup)
    expect(group!.name).toBe("Group 4")
  })

  it("should verify parameters of #getChannelGroupByID()", async () => {
    mockExecute.mockResolvedValue(mocks.channelgrouplist(5))
    const group = await teamspeak.getChannelGroupByID(4)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(group).toBeInstanceOf(TeamSpeakChannelGroup)
    expect(group!.cgid).toBe(4)
  })

  it("should verify parameters of #getChannelGroupByName()", async () => {
    mockExecute.mockResolvedValue(mocks.channelgrouplist(5))
    const group = await teamspeak.getChannelGroupByName("Group 3")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(group).toBeInstanceOf(TeamSpeakChannelGroup)
    expect(group!.name).toBe("Group 3")
  })

  it("should verify parameters of #setClientChannelGroup()", async () => {
    await teamspeak.setClientChannelGroup(10, 5, 3)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("setclientchannelgroup", { cgid: 10, cid: 5, cldbid: 3 })
  })

  it("should verify parameters of #deleteChannelGroup()", async () => {
    await teamspeak.deleteChannelGroup(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupdel", { cgid: 10, force: 0 })
  })

  it("should verify parameters of #channelGroupCopy()", async () => {
    await teamspeak.channelGroupCopy(10, 0, 1, "New Channel Group")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupcopy", {
      scgid: 10,
      tcgid: 0,
      type: 1,
      name: "New Channel Group"
    })
  })

  it("should verify parameters of #channelGroupCopy() with name", async () => {
    await teamspeak.channelGroupCopy(10, 0, 1, "New Channel Group")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupcopy", {
      scgid: 10,
      tcgid: 0,
      type: 1,
      name: "New Channel Group"
    })
  })

  it("should verify parameters of #channelGroupRename()", async () => {
    await teamspeak.channelGroupRename(10, "New Name")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgrouprename", { cgid: 10, name: "New Name" })
  })

  it("should verify parameters of #channelGroupPermList() with permsid", async () => {
    await teamspeak.channelGroupPermList(10, true)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgrouppermlist", { cgid: 10 }, ["-permsid"])
  })

  it("should verify parameters of #channelGroupPermList() with permid", async () => {
    await teamspeak.channelGroupPermList(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgrouppermlist", { cgid: 10 }, null)
  })

  it("should verify parameters of #channelGroupAddPerm() with permsid", async () => {
    await teamspeak.channelGroupAddPerm(10, "i_channel_subscribe_power", 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupaddperm", {
      cgid: 10,
      permsid: "i_channel_subscribe_power",
      permvalue: 25,
      permskip: 0,
      permnegated: 0
    })
  })

  it("should verify parameters of #channelGroupAddPerm() with permid", async () => {
    await teamspeak.channelGroupAddPerm(10, 11, 25)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupaddperm", {
      cgid: 10,
      permid: 11,
      permvalue: 25,
      permskip: 0,
      permnegated: 0
    })
  })

  it("should verify parameters of #channelGroupDelPerm() with permsid", async () => {
    await teamspeak.channelGroupDelPerm(10, "i_channel_subscribe_power")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupdelperm", {
      cgid: 10,
      permsid: "i_channel_subscribe_power"
    })
  })

  it("should verify parameters of #channelGroupDelPerm() with permid", async () => {
    await teamspeak.channelGroupDelPerm(10, 11)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupdelperm", {
      cgid: 10,
      permid: 11
    })
  })

  it("should verify parameters of #channelGroupClientList()", async () => {
    await teamspeak.channelGroupClientList(10, 5)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupclientlist", { cgid: 10, cid: 5 })
  })

  it("should verify parameters of #channelGroupClientList() without cid", async () => {
    await teamspeak.channelGroupClientList(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgroupclientlist", { cgid: 10 })
  })

  it("should verify parameters of #permOverview()", async () => {
    await teamspeak.permOverview(10, 5)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("permoverview", { cldbid: 10, cid: 5 })
  })

  it("should verify parameters of #permOverview() with permsid", async () => {
    await teamspeak.permOverview(10, 5, ["a", "b", "c"])
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("permoverview", { cldbid: 10, cid: 5, permsid: ["a", "b", "c"] })
  })

  it("should verify parameters of #permOverview() with permids", async () => {
    await teamspeak.permOverview(10, 5, [1, 2, 3])
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("permoverview", { cldbid: 10, cid: 5, permid: [1, 2, 3] })
  })

  it("should verify parameters of #permissionList()", async () => {
    await teamspeak.permissionList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("permissionlist")
  })

  it("should verify parameters of #permIdGetByName()", async () => {
    await teamspeak.permIdGetByName("b_foo")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("permidgetbyname", { permsid: "b_foo" })
  })

  it("should verify parameters of #permIdsGetByName()", async () => {
    await teamspeak.permIdsGetByName(["b_foo", "b_bar"])
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("permidgetbyname", { permsid: ["b_foo", "b_bar"] })
  })

  describe("#permGet()", () => {
    it("should verify with string parameter", async () => {
      await teamspeak.permGet("i_channel_subscribe_power")
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("permget", { permsid: "i_channel_subscribe_power" })
    })
    it("should verify with numeric parameter", async () => {
      await teamspeak.permGet(10)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("permget", { permid: 10 })
    })
  })

  describe("#permFind()", () => {
    it("should verify with string parameter", async () => {
      await teamspeak.permFind("i_channel_subscribe_power")
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("permfind", { permsid: "i_channel_subscribe_power" })
    })
    it("should verify with numeric parameter", async () => {
      await teamspeak.permFind(10)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("permfind", { permid: 10 })
    })
  })

  it("should verify parameters of #permReset()", async () => {
    await teamspeak.permReset()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("permreset")
  })

  it("should verify parameters of #privilegeKeyList()", async () => {
    await teamspeak.privilegeKeyList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("privilegekeylist")
  })

  it("should verify parameters of #privilegeKeyAdd()", async () => {
    await teamspeak.privilegeKeyAdd(0, 10, 0, "Server Group Token")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("privilegekeyadd", {
      tokentype: 0,
      tokenid1: 10,
      tokenid2: 0,
      tokendescription: "Server Group Token",
      tokencustomset: ""
    })
  })

  it("should verify some parameters of #privilegeKeyAdd()", async () => {
    await teamspeak.privilegeKeyAdd(0, 10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("privilegekeyadd", {
      tokentype: 0,
      tokenid1: 10,
      tokenid2: 0,
      tokendescription: "",
      tokencustomset: ""
    })
  })

  it("should verify parameters of #serverGroupPrivilegeKeyAdd()", async () => {
    await teamspeak.serverGroupPrivilegeKeyAdd(10, "Server Group Token")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("privilegekeyadd", {
      tokentype: 0,
      tokenid1: 10,
      tokenid2: 0,
      tokendescription: "Server Group Token",
      tokencustomset: ""
    })
  })

  it("should verify parameters of #channelGroupPrivilegeKeyAdd()", async () => {
    await teamspeak.channelGroupPrivilegeKeyAdd(10, 5, "Channel Group Token")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("privilegekeyadd", {
      tokentype: 1,
      tokenid1: 10,
      tokenid2: 5,
      tokendescription: "Channel Group Token",
      tokencustomset: ""
    })
  })

  it("should verify parameters of #privilegeKeyDelete()", async () => {
    await teamspeak.privilegeKeyDelete("asdf")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("privilegekeydelete", { token: "asdf" })
  })

  it("should verify parameters of #privilegeKeyUse()", async () => {
    await teamspeak.privilegeKeyUse("asdf")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("privilegekeyuse", { token: "asdf" })
  })

  it("should verify parameters of #messageList()", async () => {
    await teamspeak.messageList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("messagelist")
  })

  it("should verify parameters of #messageAdd()", async () => {
    await teamspeak.messageAdd("uniqueidentifier=", "title", "content")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("messageadd", {
      cluid: "uniqueidentifier=",
      subject: "title",
      message: "content"
    })
  })

  it("should verify parameters of #messageDel()", async () => {
    await teamspeak.messageDel(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("messagedel", { msgid: 10 })
  })

  it("should verify parameters of #messageGet()", async () => {
    await teamspeak.messageGet(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("messageget", { msgid: 10 })
  })

  it("should verify parameters of #messageUpdate()", async () => {
    await teamspeak.messageUpdate(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("messageupdateflag", { msgid: 10, flag: 1 })
  })

  it("should verify parameters of #complainList()", async () => {
    await teamspeak.complainList(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("complainlist", { cldbid: 10 })
  })

  it("should verify parameters of #complainAdd()", async () => {
    await teamspeak.complainAdd(10, "message")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("complainadd", { cldbid: 10, message: "message" })
  })

  describe("#complainDel()", () => {
    it("should deletes all complaints for the given dbid", async () => {
      await teamspeak.complainDel(10)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("complaindelall", { tcldbid: 10 })
    })
    it("should delete only a single complaint", async () => {
      await teamspeak.complainDel(10, 15)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("complaindel", { tcldbid: 10, fcldbid: 15 })
    })
  })

  it("should verify parameters of #banList()", async () => {
    await teamspeak.banList(5, 10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("banlist", { start: 5, duration: 10 })
  })

  it("should verify parameters of #ban()", async () => {
    const rule = { ip: "127.0.0.1", uid: "something=", name: "FooBar", mytsid: "empty", banreason: "spam", time: 60 }
    await teamspeak.ban({ ...rule })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("banadd", { ...rule })
  })

  describe("#banDel()", () => {
    it("should remove a single ban", async () => {
      await teamspeak.banDel(10)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("bandel", { banid: 10 })
    })
    it("should remove all bans", async () => {
      await teamspeak.banDel()
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockExecute).toHaveBeenCalledWith("bandelall")
    })
  })

  it("should verify parameters of #logView()", async () => {
    await teamspeak.logView()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("logview", { lines: 1000, reverse: 0, instance: 0, begin_pos: 0 })
  })

  it("should verify parameters of #logAdd()", async () => {
    await teamspeak.logAdd(LogLevel.DEBUG, "custom message")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("logadd", { loglevel: 3, logmsg: "custom message" })
  })

  it("should verify parameters of #gm()", async () => {
    await teamspeak.gm("Global Message")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("gm", { msg: "Global Message" })
  })

  it("should verify parameters of #clientDBInfo()", async () => {
    await teamspeak.clientDBInfo(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdbinfo", { cldbid: 10 })
  })

  it("should verify parameters of #clientDBFind()", async () => {
    await teamspeak.clientDBFind("John Doe")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdbfind", { pattern: "John Doe" }, null)
  })

  it("should verify parameters of #clientDBFind() with an uid", async () => {
    await teamspeak.clientDBFind("foobar=", true)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdbfind", { pattern: "foobar=" }, ["-uid"])
  })

  it("should verify parameters of #clientDBEdit()", async () => {
    await teamspeak.clientDBEdit(10, { client_description: "foo" })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdbedit", { cldbid: 10, client_description: "foo" })
  })

  it("should verify parameters of #clientDBDelete()", async () => {
    await teamspeak.clientDBDelete(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("clientdbdelete", { cldbid: 10 })
  })

  it("should verify parameters of #serverList()", async () => {
    await teamspeak.serverList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("serverlist", ["-uid", "-all"])
  })

  it("should verify parameters of #channelGroupList()", async () => {
    await teamspeak.channelGroupList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("channelgrouplist")
  })

  it("should verify parameters of #serverGroupList()", async () => {
    await teamspeak.serverGroupList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("servergrouplist")
  })

  it("should verify parameters of #channelList()", async () => {
    await teamspeak.channelList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toBeCalledWith(
      "channellist",
      ["-topic", "-flags", "-voice", "-limits", "-icon", "-secondsempty"]
    )
  })

  it("should verify parameters of #clientList()", async () => {
    await teamspeak.clientList()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toBeCalledWith(
      "clientlist",
      ["-uid", "-away", "-voice", "-times", "-groups", "-info", "-icon", "-country", "-ip"]
    )
  })

  it("should verify parameters of #ftGetFileList()", async () => {
    await teamspeak.ftGetFileList(10)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftgetfilelist", { cid: 10, path: "/", cpw: undefined })
  })

  it("should verify parameters of #ftGetFileInfo()", async () => {
    await teamspeak.ftGetFileInfo(10, "/file.txt")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftgetfileinfo", { cid: 10, name: "/file.txt", cpw: "" })
  })

  it("should verify parameters of #ftStop()", async () => {
    await teamspeak.ftStop(109100)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftstop", { serverftfid: 109100, delete: 1 })
  })

  it("should verify parameters of #ftDeleteFile()", async () => {
    await teamspeak.ftDeleteFile(10, "/file.txt")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftdeletefile", { cid: 10, name: "/file.txt", cpw: undefined })
  })

  it("should verify parameters of #ftCreateDir()", async () => {
    await teamspeak.ftCreateDir(10, "/folder")
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftcreatedir", { cid: 10, dirname: "/folder", "cpw": undefined })
  })

  it("should verify parameters of #ftRenameFile()", async () => {
    await teamspeak.ftRenameFile(10, "/file.txt", "/file2.txt", 11)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftrenamefile", {
      cid: 10,
      oldname: "/file.txt",
      newname: "/file2.txt",
      tcid: 11,
      cpw: undefined,
      tcpw: undefined
    })
  })

  it("should verify parameters of #ftInitUpload()", async () => {
    await teamspeak.ftInitUpload({ name: "/somefile.iso", clientftfid: 123, size: 1 })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftinitupload", {
      name: "/somefile.iso",
      size: 1,
      clientftfid: 123,
      cid: 0,
      resume: 0,
      overwrite: 1,
      cpw: ""
    })
  })

  it("should verify parameters of #ftInitDownload()", async () => {
    await teamspeak.ftInitDownload({ name: "/somefile.iso", clientftfid: 123 })
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("ftinitdownload", {
      name: "/somefile.iso", clientftfid: 123, cid: 0, seekpos: 0, cpw: ""
    })
  })

  
  it("should verify parameters of #uploadFile() with a string", async () => {
    mockExecute.mockResolvedValue({ size: 10, ftkey: "fookey", port: 30033 })
    mockTransfer.mockResolvedValue(null)
    await teamspeak.uploadFile("/mock.txt", "test")
    expect(mockExecute).toBeCalledTimes(1)
    expect(mockTransfer).toBeCalledTimes(1)
    expect(mockTransfer).toBeCalledWith("fookey", Buffer.from("test"))
  })

  
  it("should verify parameters of #uploadFile() with a buffer", async () => {
    const data = Buffer.from("test")
    mockExecute.mockResolvedValue({ size: 10, ftkey: "fookey", port: 30033 })
    mockTransfer.mockResolvedValue(null)
    await teamspeak.uploadFile("/mock.txt", data)
    expect(mockExecute).toBeCalledTimes(1)
    expect(mockTransfer).toBeCalledTimes(1)
    expect(mockTransfer).toBeCalledWith("fookey", data)
  })

  
  it("should verify parameters of #downloadFile()", async () => {
    mockExecute.mockResolvedValue({ size: 10, ftkey: "fookey", port: 30033 })
    mockTransfer.mockResolvedValue(Buffer.from("foodata"))
    await teamspeak.downloadFile("/mock.txt")
    expect(mockExecute).toBeCalledTimes(1)
    expect(mockTransfer).toBeCalledTimes(1)
    expect(mockTransfer).toBeCalledWith("fookey", 10)
  })


  it("should verify parameters of #forceQuit()", async () => {
    await teamspeak.forceQuit()
    expect(mockClose).toHaveBeenCalledTimes(1)
  })


  it("should verify parameters of #quit()", async () => {
    await teamspeak.quit()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith("quit")
  })

  it("should validate the return value of #getIconName()", async () => {
    mockExecute.mockResolvedValue([{ permsid: "i_icon_id", permvalue: 9999 }])
    const name = await teamspeak.getIconName(teamspeak.serverGroupPermList(8))
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(name).toBe("icon_9999")
  })

  it("should receive and handle the event clientconnect", done => {
    try {
      mockExecute.mockResolvedValue(mocks.clientlist(1))
      teamspeak.once("clientconnect", ev => {
        expect(ev.client).toBeInstanceOf(TeamSpeakClient)
        expect(ev.client.clid).toBe(1)
        expect(ev.cid).toBe(10)
        expect(mockExecute).toHaveBeenCalledTimes(1)
        done()
      })
      teamspeak["query"].emit("cliententerview", {
        ctid: 10,
        client_unique_identifier: "foobar1=",
        clid: 1,
        client_database_id: 1,
        client_type: 0 
      })
    } catch (e) {
      done(e)
    }
  })

  it("should receive and handle the event clientdisconnect", done => {
    try {
      teamspeak.once("clientdisconnect", ev => {
        expect(ev.event.clid).toBe(4)
        expect(mockExecute).toHaveBeenCalledTimes(0)
        done()
      })
      teamspeak["query"].emit("clientleftview", { clid: 4 })
    } catch (e) {
      done(e)
    }
  })

  it("should receive and handle the event tokenused", done => {
    mockExecute.mockResolvedValue(mocks.clientlist(1))
    try {
      teamspeak.once("tokenused", ev => {
        expect(ev.client).toBeInstanceOf(TeamSpeakClient)
        expect(ev.client.clid).toBe(1)
        expect(ev.token).toBe('fXy69G3Td5eYeYiLCarBXMf3SEDTi3dPbfyJtrJK')
        expect(ev.token1).toBe('7')
        expect(ev.token2).toBe('0')
        expect(mockExecute).toHaveBeenCalledTimes(1)
        done()
      })
      teamspeak["query"].emit("tokenused", {
          clid: 1,
          cldbid: 1,
          cluid: '596ScG3nXtcR++4aYEmiDqTnCdi=',
          token: 'fXy69G3Td5eYeYiLCarBXMf3SEDTi3dPbfyJtrJK',
          token1: '7',
          token2: '0'
      })
    } catch (e) {
      done(e)
    }
  })

  it("should receive and handle the event textmessage", done => {
    mockExecute.mockResolvedValue(mocks.clientlist(1))
    try {
      teamspeak.once("textmessage", ev => {
        expect(ev.msg).toBe("Message Content")
        expect(ev.invoker).toBeInstanceOf(TeamSpeakClient)
        expect(ev.invoker.clid).toBe(1)
        expect(ev.targetmode).toBe(1)
        expect(mockExecute).toHaveBeenCalledTimes(1)
        done()
      })
      teamspeak["query"].emit("textmessage", {
        msg: "Message Content",
        invokerid: 1,
        targetmode: 1 
      })
    } catch (e) {
      done(e)
    }
  })

  it("should receive and handle the event clientmoved", done => {
    mockExecute.mockResolvedValueOnce(mocks.clientlist(1))
    mockExecute.mockResolvedValueOnce(mocks.channellist(1))
    try {
      teamspeak.once("clientmoved", ev => {
        expect(ev.client).toBeInstanceOf(TeamSpeakClient)
        expect(ev.client.clid).toBe(1)
        expect(ev.channel).toBeInstanceOf(TeamSpeakChannel)
        expect(ev.channel.cid).toBe(1)
        expect(ev.reasonid).toBe(4)
        expect(mockExecute).toHaveBeenCalledTimes(2)
        done()
      })
      teamspeak["query"].emit("clientmoved", { clid: 1, ctid: 1, reasonid: 4 })
    } catch (e) {
      done(e)
    }
  })


  it("should receive and handle the event serveredit", done => {
    mockExecute.mockResolvedValue(mocks.clientlist(1))
    try {
      teamspeak.once("serveredit", ev => {
        expect(ev.invoker).toBeInstanceOf(TeamSpeakClient)
        expect(ev.invoker.clid).toBe(1)
        expect(ev.modified).toEqual({ virtualserver_name: "Renamed Server" })
        expect(ev.reasonid).toBe(10)
        expect(mockExecute).toHaveBeenCalledTimes(1)
        done()
      })
      teamspeak["query"].emit("serveredited", {
        reasonid: 10,
        invokerid: 1,
        invokername: "Client 1",
        invokeruid: "foobar1=",
        virtualserver_name: "Renamed Server"
      })
    } catch (e) {
      done(e)
    }
  })


  it("should receive and handle the event channeledit", done => {
    mockExecute.mockResolvedValueOnce(mocks.clientlist(1))
    mockExecute.mockResolvedValueOnce(mocks.channellist(1))
    try {
      teamspeak.once("channeledit", ev => {
        expect(ev.invoker).toBeInstanceOf(TeamSpeakClient)
        expect(ev.invoker.clid).toBe(1)
        expect(ev.channel).toBeInstanceOf(TeamSpeakChannel)
        expect(ev.channel.cid).toBe(1)
        expect(ev.modified).toEqual({ channel_name: "new name" })
        expect(ev.reasonid).toBe(10)
        expect(mockExecute).toHaveBeenCalledTimes(2)
        done()
      })
      teamspeak["query"].emit("channeledited", {
        cid: 1,
        reasonid: 10,
        invokerid: 1,
        invokername: "Client 1",
        invokeruid: "foobar1=",
        channel_name: "new name"
      })
    } catch (e) {
      done(e)
    }
  })


  it("should receive and handle the event channelcreate", done => {
    mockExecute.mockResolvedValueOnce(mocks.clientlist(5))
    mockExecute.mockResolvedValueOnce(mocks.channellist(5))
    teamspeak.once("channelcreate", ev => {
      expect(ev.invoker).toBeInstanceOf(TeamSpeakClient)
      expect(ev.invoker.clid).toBe(3)
      expect(ev.channel).toBeInstanceOf(TeamSpeakChannel)
      expect(ev.channel.cid).toBe(3)
      expect(ev.modified).toEqual({
        channel_name: "new channel",
        channel_codec_quality: 6,
        channel_order: 2,
        channel_codec_is_unencrypted: 1,
        channel_flag_maxfamilyclients_unlimited: 0,
        channel_flag_maxfamilyclients_inherited: 1
      })
      expect(ev.cpid).toBe(0)
      expect(mockExecute).toHaveBeenCalledTimes(2)
      done()
    })
    teamspeak["query"].emit("channelcreated", {
      cid: 3,
      cpid: 0,
      channel_name: "new channel",
      channel_codec_quality: 6,
      channel_order: 2,
      channel_codec_is_unencrypted: 1,
      channel_flag_maxfamilyclients_unlimited: 0,
      channel_flag_maxfamilyclients_inherited: 1,
      invokerid: 3,
      invokername: "TeamSpeakUser",
      invokeruid: "uid="
    })
  })


  it("should receive and handle the event channelmoved", done => {
    mockExecute.mockResolvedValueOnce(mocks.clientlist(1))
    mockExecute.mockResolvedValueOnce(mocks.channellist(2))
    mockExecute.mockResolvedValueOnce(mocks.channellist(2))
    teamspeak.once("channelmoved", ev => {
      expect(ev.invoker).toBeInstanceOf(TeamSpeakClient)
      expect(ev.invoker.clid).toBe(1)
      expect(ev.channel).toBeInstanceOf(TeamSpeakChannel)
      expect(ev.channel.cid).toBe(1)
      expect(ev.parent).toBeInstanceOf(TeamSpeakChannel)
      expect(ev.parent.cid).toBe(2)
      expect(ev.order).toBe(0)
      expect(mockExecute).toHaveBeenCalledTimes(3)
      done()
    })
    teamspeak["query"].emit("channelmoved", {
      cid: 1,
      cpid: 2,
      order: 0,
      reasonid: 1,
      invokerid: 1,
      invokername: "Client 1",
      invokeruid: "foobar1="
    })
  })


  it("should receive and handle the event channeldelete", done => {
    mockExecute.mockResolvedValue(mocks.clientlist(5))
    teamspeak.once("channeldelete", ev => {
      expect(ev.invoker).toBeInstanceOf(TeamSpeakClient)
      expect(ev.invoker.clid).toBe(1)
      expect(ev.cid).toBe(4)
      expect(mockExecute).toHaveBeenCalledTimes(1)
      done()
    })
    teamspeak["query"].emit("channeldeleted", {
      invokerid: 1,
      invokername: "Client 1",
      invokeruid: "foobar1=",
      cid: 4
    })
  })


  describe("#filter()", () => {
    const mockData: any = [
      { foo: "bar", bar: "baz", list: ["a", "b", "c"] }, 
      { foo: "baz", bar: "foo", list: ["c"] },
      { foo: "bar", bar: "bar", list: ["a", "b"] },
      { foo: "",    bar: "", list: [] }
    ]

    it("should filter an array of objects with 1 filter parameter", () => {
      const filter: any = { foo: "bar" }
      expect(TeamSpeak.filter(mockData, filter))
        .toEqual([mockData[0], mockData[2]])
    })

    it("should filter an array of objects with 2 filter parameters", () => {
      const filter: any = { foo: "bar", bar: "baz" }
      expect(TeamSpeak.filter(mockData, filter))
        .toEqual([mockData[0]])
    })

    it("should filter an array of objects with an array with 1 item as filter array", () => {
      const filter: any = { list: "c" }
      expect(TeamSpeak.filter(mockData, filter))
        .toEqual([mockData[0], mockData[1]])
    })

    it("should filter an array of objects with an array with 2 item as filter array", () => {
      const filter: any = { list: ["a", "b"] }
      expect(TeamSpeak.filter(mockData, filter))
        .toEqual([mockData[0], mockData[2]])
    })
  })

  describe("#toArray()", () => {
    it("should convert undefined to an empty array", () => {
      expect(TeamSpeak.toArray(undefined)).toEqual([])
    })
    it("should convert null to an empty array", () => {
      expect(TeamSpeak.toArray(null)).toEqual([])
    })
    it("should convert a single string to an array with the string in it", () => {
      expect(TeamSpeak.toArray("foo bar")).toEqual(["foo bar"])
    })
    it("should do nothing with an array as argument", () => {
      expect(TeamSpeak.toArray(["jane doe", "john doe"])).toEqual(["jane doe", "john doe"])
    })
  })

})
